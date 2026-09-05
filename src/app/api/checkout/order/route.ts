import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getPlan } from '@/lib/pricing';
import { createOrder, getPublicKeyId, isRazorpayConfigured } from '@/lib/razorpay';
import { activatePlan } from '@/lib/subscription';

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

        const body = await request.json().catch(() => ({}));
        const plan = getPlan(body.planType);

        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Free trial: no payment, activate immediately.
        if (plan.amount === 0) {
            const { mappedRole } = await activatePlan(user.id, plan);
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
            amountMajor: plan.amount,
            currency: plan.currency,
            receipt: `sub_${user.id.slice(0, 8)}_${Date.now()}`,
            notes: { userId: user.id, planType: body.planType ?? 'everyday' },
        });

        await prisma.payment.create({
            data: {
                userId: user.id,
                planType: plan.dbPlanType,
                amount: plan.amount,
                currency: plan.currency,
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
            prefill: { name: user.name, email: user.email, contact: user.phone ?? '' },
        });
    } catch (error) {
        console.error('Checkout order error:', error);
        return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
    }
}
