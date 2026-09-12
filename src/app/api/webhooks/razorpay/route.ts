import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { PLANS, getPlan, regionFor } from '@/lib/pricing';
import { activatePlan, SubscriptionProviderConflictError } from '@/lib/subscription';
import { issueInvoiceForPayment } from '@/lib/invoice';
import { confirmAndActivate } from '@/lib/checkoutConfirm';
import { recordEvent, recordRevenue } from '@/lib/analytics';
import { markReferralConverted } from '@/lib/referral';
import { sendEmail, emailLayout } from '@/lib/email';
import { sendPush } from '@/lib/push';
import type { PlanType } from '@prisma/client';

function planFrom(planKey: string | null, planType: PlanType | null) {
    if (planKey) return getPlan(planKey);
    return Object.values(PLANS).find((p) => p.dbPlanType === planType) ?? PLANS.everyday;
}

/**
 * Razorpay webhook. Configure at dashboard.razorpay.com > Settings > Webhooks
 * with events: subscription.charged, subscription.cancelled, subscription.halted,
 * subscription.completed. Secret must match RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
    const raw = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
        console.warn('[razorpay webhook] RAZORPAY_WEBHOOK_SECRET unset — ignoring event');
        return NextResponse.json({ ignored: true });
    }

    let valid = false;
    try {
        valid = verifyWebhookSignature(raw, signature);
    } catch {
        valid = false;
    }
    if (!valid) {
        return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
    }

    let event: {
        event: string;
        payload: {
            subscription?: { entity: { id: string; current_end: number | null } };
            payment?: { entity: { id: string; amount: number; currency: string; order_id?: string | null } };
        };
    };
    try {
        event = JSON.parse(raw);
    } catch {
        return NextResponse.json({ error: 'bad json' }, { status: 400 });
    }

    try {
        const subEntity = event.payload.subscription?.entity;
        const payEntity = event.payload.payment?.entity;

        // One-time order payments (the discounted-checkout path) have no
        // subscription entity at all, so they were previously ignored entirely
        // here — if the client's browser closed before /checkout/verify ran,
        // a real payment stayed CREATED forever with nothing to reconcile it.
        // Handle that case before falling into the subscription-only logic below.
        if (!subEntity && event.event === 'payment.captured' && payEntity?.order_id) {
            const pending = await prisma.payment.findUnique({ where: { providerOrderId: payEntity.order_id } });
            if (pending && pending.status === 'CREATED') {
                const result = await confirmAndActivate({
                    userId: pending.userId,
                    paymentRecord: pending,
                    razorpayPaymentId: payEntity.id,
                    recurring: false,
                });
                if (!result.ok) {
                    console.error('[razorpay webhook] order payment reconciliation failed', result.error);
                }
            }
            return NextResponse.json({ ok: true, note: 'order payment handled' });
        }

        if (!subEntity) {
            return NextResponse.json({ ok: true, note: 'no subscription entity' });
        }

        // Resolve the local subscription. It may not exist yet if the user closed
        // the browser before /verify ran — fall back to the pending Payment row
        // that /checkout/subscribe wrote, so the webhook alone can activate.
        const subscription = await prisma.subscription.findFirst({
            where: { billingProviderId: subEntity.id },
            include: { user: true },
        });

        let userId = subscription?.userId ?? null;
        let planType: PlanType | null = subscription?.planType ?? null;
        let planKey: string | null = subscription?.planKey ?? null;

        if (!subscription) {
            const pending = await prisma.payment.findFirst({
                where: { providerSubscriptionId: subEntity.id },
                orderBy: { createdAt: 'desc' },
            });
            if (pending) {
                userId = pending.userId;
                planType = pending.planType;
                planKey = pending.planKey;
            }
        }

        if (!userId || !planType) {
            return NextResponse.json({ ok: true, note: 'no local user for this subscription' });
        }
        const plan = planFrom(planKey, planType);
        const region = regionFor(payEntity?.currency ?? subscription?.currency);

        switch (event.event) {
            case 'subscription.charged': {
                if (payEntity) {
                    // Idempotent on providerPaymentId (@unique).
                    const existing = await prisma.payment.findUnique({
                        where: { providerPaymentId: payEntity.id },
                    });
                    if (existing) {
                        return NextResponse.json({ ok: true, note: 'duplicate charge' });
                    }
                    const created = await prisma.payment.create({
                        data: {
                            userId,
                            planType,
                            amount: payEntity.amount / 100,
                            currency: payEntity.currency,
                            status: 'PAID',
                            provider: 'razorpay',
                            providerSubscriptionId: subEntity.id,
                            providerPaymentId: payEntity.id,
                        },
                    });
                    void issueInvoiceForPayment(created.id).catch(() => {});
                }

                const renewalDate = subEntity.current_end
                    ? new Date(subEntity.current_end * 1000)
                    : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; })();

                const firstActivation = !subscription;
                // A scheduled downgrade (e.g. Everyday → Starter) takes effect on
                // this renewal: swap in the pending plan and clear the marker.
                const effectivePlan =
                    subscription?.pendingPlanKey ? getPlan(subscription.pendingPlanKey) : plan;
                // activatePlan upserts the Subscription, sets role + billingProviderId,
                // and tops up credits — the same idempotent path /verify uses.
                try {
                    await activatePlan(userId, effectivePlan, {
                        recurring: true,
                        subscriptionId: subEntity.id,
                        renewalDate,
                        region,
                        ...(payEntity ? { amount: payEntity.amount / 100, currency: payEntity.currency } : {}),
                    });
                } catch (err) {
                    if (err instanceof SubscriptionProviderConflictError) {
                        // The Payment row above (if any) already recorded the charge —
                        // refusing here only blocks overwriting the user's other live
                        // subscription's billing id. Needs a human to reconcile; don't
                        // let Razorpay retry a conflict that won't resolve itself.
                        console.error(`[razorpay webhook] provider conflict for user ${userId}: ${err.message}`);
                        return NextResponse.json({ ok: true, note: 'provider conflict — not applied' });
                    }
                    throw err;
                }
                if (subscription?.pendingPlanKey) {
                    await prisma.subscription.update({
                        where: { id: subscription.id },
                        data: { pendingPlanKey: null },
                    });
                }

                recordEvent(firstActivation ? 'SUBSCRIPTION' : 'SUBSCRIPTION_RENEWED', {
                    userId,
                    metadata: { plan: planType },
                });
                if (firstActivation && planType !== 'TRIAL') {
                    void markReferralConverted(userId, planType).catch(() => {});
                }
                if (!firstActivation) {
                    sendPush(userId, {
                        title: 'Membership renewed',
                        body: `Your ${effectivePlan.name} plan renewed successfully.`,
                        url: '/dashboard/billing',
                        channelId: 'billing',
                    }).catch(() => {});
                }
                if (payEntity) {
                    recordRevenue({
                        userId,
                        amount: payEntity.amount / 100,
                        currency: payEntity.currency,
                        planType,
                        providerId: payEntity.id,
                    });
                }
                break;
            }

            case 'subscription.cancelled':
            case 'subscription.halted':
            case 'subscription.completed': {
                if (subscription) {
                    await prisma.subscription.update({
                        where: { id: subscription.id },
                        data: { status: 'CANCELLED' },
                    });
                }
                recordEvent('SUBSCRIPTION_CANCELLED', { userId, metadata: { reason: event.event } });
                break;
            }

            case 'subscription.pending':
            case 'payment.failed': {
                if (payEntity) {
                    await prisma.payment.updateMany({
                        where: { providerSubscriptionId: subEntity.id, status: { in: ['CREATED'] } },
                        data: { status: 'FAILED', providerPaymentId: payEntity.id },
                    });
                }
                recordEvent('PAYMENT_FAILED', { userId, metadata: { plan: planType } });
                sendPush(userId, {
                    title: 'A payment did not go through',
                    body: 'Update your payment method to keep your Shakti Yoga access.',
                    url: '/dashboard/billing',
                    channelId: 'billing',
                }).catch(() => {});
                const u = subscription?.user ?? (await prisma.user.findUnique({ where: { id: userId } }));
                if (u) {
                    sendEmail({
                        to: u.email,
                        subject: 'Your Shakti Yoga payment could not be processed',
                        html: emailLayout(
                            `<p>Hi ${u.name.split(' ')[0] || 'there'},</p>
                             <p>We weren't able to charge your card for the ${plan.name} plan. Razorpay will retry automatically over the next few days.</p>
                             <p>To avoid any interruption, update your payment method from your billing page.</p>`,
                        ),
                    }).catch(() => { });
                }
                break;
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[razorpay webhook] handler error', error);
        // 200 so Razorpay doesn't hammer retries for a transient DB blip we've logged.
        return NextResponse.json({ ok: false });
    }
}
