import { prisma } from '@/lib/prisma';
import { PLANS, formatPrice, getPlan, regionFor } from '@/lib/pricing';
import { fetchPayment } from '@/lib/razorpay';
import { activatePlan, SubscriptionProviderConflictError } from '@/lib/subscription';
import { issueInvoiceForPayment } from '@/lib/invoice';
import { sendEmail, emailLayout } from '@/lib/email';
import { recordEvent, recordRevenue } from '@/lib/analytics';
import { posthogCapture, posthogIdentify } from '@/lib/posthog';
import { markReferralConverted, consumeCheckoutDiscount } from '@/lib/referral';
import type { PlanType, Payment } from '@prisma/client';

export function planForPayment(p: Payment) {
    if (p.planKey) return getPlan(p.planKey);
    return Object.values(PLANS).find((x) => x.dbPlanType === (p.planType as PlanType)) ?? PLANS.everyday;
}

/**
 * Shared "a Razorpay payment has been confirmed" path — cross-checks the
 * amount with Razorpay, marks the Payment PAID, activates the plan, and
 * fires the usual analytics/referral/email side effects. Used by both the
 * client-driven /api/checkout/verify call and the Razorpay webhook, so a
 * payment that completes without the client ever calling verify (browser
 * closed, network drop) still gets reconciled server-side.
 */
export async function confirmAndActivate(params: {
    userId: string;
    paymentRecord: Payment;
    razorpayPaymentId: string;
    razorpaySignature?: string;
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
        data: { status: 'PAID', providerPaymentId: razorpayPaymentId, providerSignature: razorpaySignature ?? null },
    });
    void issueInvoiceForPayment(paymentRecord.id).catch(() => {});

    const plan = planForPayment(paymentRecord);
    const region = regionFor(paymentRecord.currency);
    let activation;
    try {
        activation = await activatePlan(userId, plan, {
            recurring, subscriptionId, region,
            amount: paymentRecord.amount, currency: paymentRecord.currency,
        });
    } catch (err) {
        if (err instanceof SubscriptionProviderConflictError) {
            // Razorpay already captured this money — that's real and stays
            // recorded as PAID above (with its invoice). What's refused is
            // silently overwriting the member's other live subscription's
            // billing id. This needs a human to reconcile (likely: cancel the
            // other provider's subscription, or refund this payment), so
            // surface it clearly rather than guessing which side should win.
            console.error(`[checkout] provider conflict for user ${userId}: ${err.message} (payment ${paymentRecord.id} stays PAID, unreconciled)`);
            return { ok: false as const, status: 409, error: `${err.message} Contact support to reconcile — your payment was received.` };
        }
        throw err;
    }
    const { user, mappedRole } = activation;

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
