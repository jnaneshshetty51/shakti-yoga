import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { PLANS, formatPrice, getPlan, regionFor } from '@/lib/pricing';
import { verifyPaymentSignature, verifySubscriptionSignature, fetchPayment } from '@/lib/razorpay';
import { activatePlan } from '@/lib/subscription';
import { issueInvoiceForPayment } from '@/lib/invoice';
import { sendEmail, emailLayout } from '@/lib/email';
import { recordEvent, recordRevenue } from '@/lib/analytics';
import { posthogCapture, posthogIdentify } from '@/lib/posthog';
import { markReferralConverted, consumeCheckoutDiscount } from '@/lib/referral';
import type { PlanType, Payment } from '@prisma/client';

function planForPayment(p: Payment) {
    if (p.planKey) return getPlan(p.planKey);
    return Object.values(PLANS).find((x) => x.dbPlanType === (p.planType as PlanType)) ?? PLANS.everyday;
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
    void issueInvoiceForPayment(paymentRecord.id).catch(() => {});

    const plan = planForPayment(paymentRecord);
    const region = regionFor(paymentRecord.currency);
    const { user, mappedRole } = await activatePlan(userId, plan, {
        recurring, subscriptionId, region,
        amount: paymentRecord.amount, currency: paymentRecord.currency,
    });

    // Spend any referral wallet credit / one-time referee discount this order carried,
    // then (for a real first payment) reward the referrer.
    if (paymentRecord.creditApplied > 0 || paymentRecord.refereeDiscountApplied > 0) {
        await consumeCheckoutDiscount(userId, {
            creditApplied: paymentRecord.creditApplied,
            refereeDiscountApplied: paymentRecord.refereeDiscountApplied,
        }).catch(() => {});
    }

    recordEvent('SUBSCRIPTION', { userId, metadata: { plan: plan.key, recurring } });
    posthogCapture(userId, 'subscription_started', { plan: plan.key, billing: 'razorpay', recurring, amount: paymentRecord.amount });
    posthogIdentify(userId, { plan: plan.key, role: mappedRole, subscribed_at: new Date().toISOString() });
    if (plan.interval !== 'trial') void markReferralConverted(userId, paymentRecord.planType).catch(() => {});
    recordRevenue({
        userId,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        planType: paymentRecord.planType,
        providerId: razorpayPaymentId,
    });

    sendEmail({
        to: user.email,
        subject: `Payment received — ${plan.name}`,
        html: emailLayout(
            `<p>Hi ${user.name.split(' ')[0] || 'there'},</p>
             <p>We've received your payment of <strong>${formatPrice(paymentRecord.amount, paymentRecord.currency)}</strong> for the ${plan.name} plan${recurring ? ` (renews ${plan.interval === 'annual' ? 'yearly' : 'monthly'})` : ''}.</p>
             <p>Payment reference: <code>${razorpayPaymentId}</code></p>
             <p>Your membership is active. Namaste 🙏</p>`,
        ),
    }).catch(() => { });

    return { ok: true as const, user: { id: user.id, name: user.name, email: user.email, role: mappedRole } };
}

export async function POST(request: Request) {
    try {
        const payload = await getSession();
        if (!payload) {
            return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const asStr = (v: unknown) => (typeof v === 'string' && v.length > 0 && v.length <= 256 ? v : undefined);
        const razorpay_order_id = asStr(body.razorpay_order_id);
        const razorpay_subscription_id = asStr(body.razorpay_subscription_id);
        const razorpay_payment_id = asStr(body.razorpay_payment_id);
        const razorpay_signature = asStr(body.razorpay_signature);

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
        if (!razorpay_order_id) {
            return NextResponse.json({ error: 'Missing order id.' }, { status: 400 });
        }
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
