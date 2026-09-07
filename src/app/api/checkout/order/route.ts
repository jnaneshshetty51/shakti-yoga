import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getPlan, isPlanKey, priceFor, regionFor, LADDER } from '@/lib/pricing';
import { createOrder, getPublicKeyId, isRazorpayConfigured } from '@/lib/razorpay';
import { activatePlan } from '@/lib/subscription';
import { readJson, ValidationError, handleValidationError } from '@/lib/validation';

const KEYS = ['trial', ...LADDER] as const;

export async function POST(request: Request) {
    try {
        const payload = await getSession();
        if (!payload) return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });

        const body = await readJson(request);
        // Accepts the legacy `planType` or the new `planKey`.
        const rawKey = String(body.planKey ?? body.planType ?? '');
        const key = (KEYS as readonly string[]).includes(rawKey) ? rawKey : 'everyday';
        if (!isPlanKey(key) && key !== 'trial') {
            return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });
        }
        const plan = getPlan(key);
        const region = regionFor(typeof body.region === 'string' ? body.region : payload.email);
        const price = priceFor(plan, region);

        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Free trial: no payment, activate immediately. One per person.
        if (plan.interval === 'trial') {
            if (user.trialStartedAt) {
                return NextResponse.json({ error: 'You have already used your free trial.' }, { status: 409 });
            }
            const { mappedRole } = await activatePlan(user.id, plan, { region });
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

        const order = await createOrder({
            amountMajor: price.amount,
            currency: price.currency,
            receipt: `sub_${user.id.slice(0, 8)}_${Date.now()}`,
            notes: { userId: user.id, planKey: key, region },
        });

        await prisma.payment.create({
            data: {
                userId: user.id,
                planType: plan.dbPlanType,
                planKey: key,
                amount: price.amount,
                currency: price.currency,
                status: 'CREATED',
                provider: 'razorpay',
                providerOrderId: order.id,
            },
        });

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: getPublicKeyId(),
            planName: plan.name,
            planKey: key,
            prefill: { name: user.name, email: user.email, contact: user.phone ?? '' },
        });
    } catch (error) {
        if (error instanceof ValidationError) return handleValidationError(error);
        console.error('Checkout order error:', error);
        return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
    }
}
