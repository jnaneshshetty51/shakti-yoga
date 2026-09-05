import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { PLANS, formatPrice } from '@/lib/pricing';
import { verifyPaymentSignature, verifySubscriptionSignature, fetchPayment } from '@/lib/razorpay';
import { activatePlan } from '@/lib/subscription';
import { sendEmail, emailLayout } from '@/lib/email';
import type { PlanType, Payment } from '@prisma/client';

function planConfigForDbType(planType: PlanType) {
    return Object.values(PLANS).find(p => p.dbPlanType === planType) ?? PLANS.everyday;
}

async function confirmAndActivate(params: {
    userId: string;
    paymentRecord: Payment;
    razorpayPaymentId: string;
    razorpaySignature: string;
    recurring: boolean;
    subscriptionId?: string;
}) {
    const { userId, paymentRecord, razorpayPaymentId, razorpaySignature, recurring, subscriptionId } = params;

    // Cross-check with Razorpay that the payment captured the right amount.
    const remote = await fetchPayment(razorpayPaymentId);
    const expectedPaise = Math.round(paymentRecord.amount * 100);
    if ((remote.status !== 'captured' && remote.status !== 'authorized') || remote.amount !== expectedPaise) {
        await prisma.payment.update({
            where: { id: paymentRecord.id },
            data: { status: 'FAILED', providerPaymentId: razorpayPaymentId },
        });
        return { ok: false as const, status: 400, error: 'Payment could not be confirmed.' };
    }

    await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: { status: 'PAID', providerPaymentId: razorpayPaymentId, providerSignature: razorpaySignature },
    });

    const plan = planConfigForDbType(paymentRecord.planType);
    const { user, mappedRole } = await activatePlan(userId, plan, { recurring, subscriptionId });

    sendEmail({
        to: user.email,
        subject: `Payment received — ${plan.name}`,
        html: emailLayout(
            `<p>Hi ${user.name.split(' ')[0] || 'there'},</p>
             <p>We've received your payment of <strong>${formatPrice(paymentRecord.amount, paymentRecord.currency)}</strong> for the ${plan.name} plan${recurring ? ' (renews monthly)' : ''}.</p>
             <p>Payment reference: <code>${razorpayPaymentId}</code></p>
             <p>Your membership is active. Namaste 🙏</p>`,
        ),
    }).catch(() => { });

    return { ok: true as const, user: { id: user.id, name: user.name, email: user.email, role: mappedRole } };
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

        const body = await request.json().catch(() => ({}));
        const {
            razorpay_order_id,
            razorpay_subscription_id,
            razorpay_payment_id,
            razorpay_signature,
        } = body;

        if (!razorpay_payment_id || !razorpay_signature || (!razorpay_order_id && !razorpay_subscription_id)) {
            return NextResponse.json({ error: 'Missing payment confirmation fields.' }, { status: 400 });
        }

        // --- Recurring subscription payment ---
        if (razorpay_subscription_id) {
            const paymentRecord = await prisma.payment.findFirst({
                where: { providerSubscriptionId: razorpay_subscription_id, userId: payload.id },
                orderBy: { createdAt: 'desc' },
            });
            if (!paymentRecord) {
                return NextResponse.json({ error: 'Unknown subscription.' }, { status: 404 });
            }
            if (paymentRecord.status === 'PAID') {
                return NextResponse.json({ success: true, alreadyProcessed: true });
            }

            const valid = verifySubscriptionSignature({
                paymentId: razorpay_payment_id,
                subscriptionId: razorpay_subscription_id,
                signature: razorpay_signature,
            });
            if (!valid) {
                await prisma.payment.update({
                    where: { id: paymentRecord.id },
                    data: { status: 'FAILED', providerPaymentId: razorpay_payment_id },
                });
                return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
            }

            const result = await confirmAndActivate({
                userId: payload.id,
                paymentRecord,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                recurring: true,
                subscriptionId: razorpay_subscription_id,
            });
            if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
            return NextResponse.json({ success: true, user: result.user });
        }

        // --- One-time order payment ---
        const paymentRecord = await prisma.payment.findUnique({ where: { providerOrderId: razorpay_order_id } });
        if (!paymentRecord || paymentRecord.userId !== payload.id) {
            return NextResponse.json({ error: 'Unknown order.' }, { status: 404 });
        }
        if (paymentRecord.status === 'PAID') {
            return NextResponse.json({ success: true, alreadyProcessed: true });
        }

        const valid = verifyPaymentSignature({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
        });
        if (!valid) {
            await prisma.payment.update({
                where: { id: paymentRecord.id },
                data: { status: 'FAILED', providerPaymentId: razorpay_payment_id },
            });
            return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
        }

        const result = await confirmAndActivate({
            userId: payload.id,
            paymentRecord,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            recurring: false,
        });
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
        return NextResponse.json({ success: true, user: result.user });
    } catch (error) {
        console.error('Checkout verify error:', error);
        return NextResponse.json({ error: 'Could not verify payment. If you were charged, contact support.' }, { status: 500 });
    }
}
