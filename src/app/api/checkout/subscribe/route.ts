import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getPlan, type PlanConfig } from '@/lib/pricing';
import {
    createMonthlyPlan,
    createSubscription,
    getPublicKeyId,
    isRazorpayConfigured,
} from '@/lib/razorpay';
import { activatePlan } from '@/lib/subscription';
import { readJson, oneOf, ValidationError, handleValidationError } from '@/lib/validation';
import { recordEvent } from '@/lib/analytics';

/** Reuse a Razorpay plan per (planKey, amount, currency); create + cache on first use. */
async function getOrCreatePlanId(planKey: string, plan: PlanConfig): Promise<string> {
    const settingKey = `razorpay_plan_${planKey}_${plan.amount}_${plan.currency}`;
    const cached = await prisma.setting.findUnique({ where: { key: settingKey } });
    if (cached) return cached.value;

    const created = await createMonthlyPlan({
        amountMajor: plan.amount,
        currency: plan.currency,
        name: `${plan.name} (monthly)`,
    });
    await prisma.setting.create({ data: { key: settingKey, value: created.id } });
    return created.id;
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });
        }
        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
        }

        const body = await readJson(request);
        const planKey = oneOf(body.planType, ['everyday', 'therapy', 'trial'] as const, 'planType');
        const plan = getPlan(planKey);

        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Free trial: no payment, activate immediately (non-recurring).
        if (plan.amount === 0) {
            if (plan.dbPlanType === 'TRIAL' && user.trialStartedAt) {
                return NextResponse.json(
                    { error: 'You have already used your free trial. Choose a plan to continue.' },
                    { status: 409 },
                );
            }
            if (plan.dbPlanType === 'TRIAL' && (user.role === 'MEMBER_EVERYDAY' || user.role === 'MEMBER_THERAPY')) {
                return NextResponse.json(
                    { error: 'You already have an active membership.' },
                    { status: 409 },
                );
            }
            const { mappedRole } = await activatePlan(user.id, plan);
            recordEvent('TRIAL_START', { userId: user.id });
            return NextResponse.json({
                free: true,
                user: { id: user.id, name: user.name, email: user.email, role: mappedRole },
            });
        }

        if (!isRazorpayConfigured()) {
            return NextResponse.json(
                { error: 'Payments are not configured yet. Please contact us to activate your membership.' },
                { status: 503 },
            );
        }

        const planId = await getOrCreatePlanId(planKey, plan);
        const subscription = await createSubscription({
            planId,
            notes: { userId: user.id, planKey },
        });

        await prisma.payment.create({
            data: {
                userId: user.id,
                planType: plan.dbPlanType,
                amount: plan.amount,
                currency: plan.currency,
                status: 'CREATED',
                provider: 'razorpay',
                providerSubscriptionId: subscription.id,
            },
        });

        return NextResponse.json({
            subscriptionId: subscription.id,
            keyId: getPublicKeyId(),
            planName: plan.name,
            prefill: { name: user.name, email: user.email, contact: user.phone ?? '' },
        });
    } catch (error) {
        if (error instanceof ValidationError) return handleValidationError(error);
        console.error('Checkout subscribe error:', error);
        return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
    }
}
