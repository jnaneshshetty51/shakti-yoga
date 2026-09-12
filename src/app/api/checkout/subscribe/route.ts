import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isPlanKey, priceFor, regionFor, LADDER, type PlanConfig, type Region } from '@/lib/pricing';
import { resolvedPlan } from '@/lib/plans';
import {
    createRecurringPlan,
    createSubscription,
    createOrder,
    getPublicKeyId,
    isRazorpayConfigured,
} from '@/lib/razorpay';
import { activatePlan, SubscriptionProviderConflictError } from '@/lib/subscription';
import { previewCheckoutDiscount, consumeCheckoutDiscount, markReferralConverted } from '@/lib/referral';
import { readJson, ValidationError, handleValidationError } from '@/lib/validation';
import { recordEvent } from '@/lib/analytics';

const KEYS = ['trial', ...LADDER] as const;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Reuse a Razorpay plan per (planKey, region); create + cache on first use. */
async function getOrCreatePlanId(plan: PlanConfig, region: Region): Promise<string> {
    const price = priceFor(plan, region);
    const settingKey = `razorpay_plan_${plan.key}_${price.currency}_${price.amount}`;
    const cached = await prisma.setting.findUnique({ where: { key: settingKey } });
    if (cached) return cached.value;

    const created = await createRecurringPlan({
        amountMajor: price.amount,
        currency: price.currency,
        name: plan.name,
        period: plan.interval === 'annual' ? 'yearly' : 'monthly',
    });
    await prisma.setting.create({ data: { key: settingKey, value: created.id } });
    return created.id;
}

export async function POST(request: Request) {
    try {
        const payload = await getSession();
        if (!payload) return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });

        const body = await readJson(request);
        const rawKey = String(body.planKey ?? body.planType ?? '');
        const key = (KEYS as readonly string[]).includes(rawKey) ? rawKey : 'everyday';
        const plan = await resolvedPlan(key);
        const region = regionFor(typeof body.region === 'string' ? body.region : payload.email);
        const price = priceFor(plan, region);

        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        if (plan.interval === 'trial') {
            if (user.trialStartedAt) {
                return NextResponse.json(
                    { error: 'You have already used your free trial. Choose a plan to continue.' },
                    { status: 409 },
                );
            }
            if (user.role === 'MEMBER_EVERYDAY' || user.role === 'MEMBER_THERAPY' || user.role === 'MEMBER_STARTER') {
                return NextResponse.json({ error: 'You already have an active membership.' }, { status: 409 });
            }
            const { mappedRole } = await activatePlan(user.id, plan, { region });
            recordEvent('TRIAL_START', { userId: user.id });
            return NextResponse.json({
                free: true,
                user: { id: user.id, name: user.name, email: user.email, role: mappedRole },
            });
        }

        if (!isPlanKey(key)) return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });

        // Referral: ₹ wallet credit + one-time referee discount (INR only, non-trial).
        const discount = await previewCheckoutDiscount(user.id, price.currency, plan.interval, price.amount);
        const totalDiscount = round2(discount.creditApplied + discount.refereeDiscountApplied);
        const netAmount = Math.max(0, round2(price.amount - totalDiscount));

        // Fully covered by referral credit — no gateway, activate immediately.
        if (totalDiscount > 0 && netAmount <= 0) {
            await consumeCheckoutDiscount(user.id, discount);
            await prisma.payment.create({
                data: {
                    userId: user.id,
                    planType: plan.dbPlanType,
                    planKey: key,
                    amount: 0,
                    currency: price.currency,
                    status: 'PAID',
                    provider: 'razorpay',
                    creditApplied: discount.creditApplied,
                    refereeDiscountApplied: discount.refereeDiscountApplied,
                },
            });
            const { mappedRole } = await activatePlan(user.id, plan, { region, amount: 0, currency: price.currency });
            void markReferralConverted(user.id, plan.dbPlanType).catch(() => {});
            return NextResponse.json({
                free: true,
                covered: true,
                user: { id: user.id, name: user.name, email: user.email, role: mappedRole },
            });
        }

        if (!isRazorpayConfigured()) {
            return NextResponse.json(
                { error: 'Payments are not configured yet. Please contact us to activate your membership.' },
                { status: 503 },
            );
        }

        const prefill = { name: user.name, email: user.email, contact: user.phone ?? '' };
        const paymentBase = {
            userId: user.id,
            planType: plan.dbPlanType,
            planKey: key,
            amount: netAmount,
            currency: price.currency,
            status: 'CREATED' as const,
            provider: 'razorpay',
            creditApplied: discount.creditApplied,
            refereeDiscountApplied: discount.refereeDiscountApplied,
        };

        // A referral discount only reduces this one payment, so it can't ride on an
        // auto-renewing subscription — take the one-time order path instead (renewal
        // is manual anyway).
        if (totalDiscount > 0) {
            const order = await createOrder({
                amountMajor: netAmount,
                currency: price.currency,
                receipt: `sub_${user.id.slice(0, 8)}_${Date.now()}`,
                notes: { userId: user.id, planKey: key, region },
            });
            await prisma.payment.create({ data: { ...paymentBase, providerOrderId: order.id } });
            return NextResponse.json({
                mode: 'order',
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: getPublicKeyId(),
                planName: plan.name,
                grossAmount: price.amount,
                discount,
                prefill,
            });
        }

        // Prefer an auto-renewing subscription; fall back to a one-time order if
        // the Razorpay account has Subscriptions disabled.
        try {
            const planId = await getOrCreatePlanId(plan, region);
            const subscription = await createSubscription({ planId, notes: { userId: user.id, planKey: key, region } });
            await prisma.payment.create({ data: { ...paymentBase, providerSubscriptionId: subscription.id } });
            return NextResponse.json({
                mode: 'subscription',
                subscriptionId: subscription.id,
                keyId: getPublicKeyId(),
                planName: plan.name,
                prefill,
            });
        } catch (subErr) {
            console.warn(
                '[checkout] subscription path unavailable, falling back to one-time order:',
                subErr instanceof Error ? subErr.message : subErr,
            );
            const order = await createOrder({
                amountMajor: price.amount,
                currency: price.currency,
                receipt: `sub_${user.id.slice(0, 8)}_${Date.now()}`,
                notes: { userId: user.id, planKey: key, region },
            });
            await prisma.payment.create({ data: { ...paymentBase, providerOrderId: order.id } });
            return NextResponse.json({
                mode: 'order',
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: getPublicKeyId(),
                planName: plan.name,
                prefill,
            });
        }
    } catch (error) {
        if (error instanceof ValidationError) return handleValidationError(error);
        if (error instanceof SubscriptionProviderConflictError) {
            return NextResponse.json({ error: `${error.message} Manage or cancel it first, or contact support.` }, { status: 409 });
        }
        console.error('Checkout subscribe error:', error);
        return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
    }
}
