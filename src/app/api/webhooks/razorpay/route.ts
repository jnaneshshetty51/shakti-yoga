import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { PLANS } from '@/lib/pricing';
import { activatePlan } from '@/lib/subscription';
import { recordEvent, recordRevenue } from '@/lib/analytics';
import { sendEmail, emailLayout } from '@/lib/email';
import type { PlanType } from '@prisma/client';

function planConfigForDbType(planType: PlanType) {
    return Object.values(PLANS).find(p => p.dbPlanType === planType) ?? PLANS.everyday;
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
            payment?: { entity: { id: string; amount: number; currency: string } };
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

        if (!subscription) {
            const pending = await prisma.payment.findFirst({
                where: { providerSubscriptionId: subEntity.id },
                orderBy: { createdAt: 'desc' },
            });
            if (pending) {
                userId = pending.userId;
                planType = pending.planType;
            }
        }

        if (!userId || !planType) {
            return NextResponse.json({ ok: true, note: 'no local user for this subscription' });
        }
        const plan = planConfigForDbType(planType);

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
                    await prisma.payment.create({
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
                }

                const renewalDate = subEntity.current_end
                    ? new Date(subEntity.current_end * 1000)
                    : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; })();

                const firstActivation = !subscription;
                // activatePlan upserts the Subscription, sets role + billingProviderId,
                // and tops up credits — the same idempotent path /verify uses.
                await activatePlan(userId, plan, {
                    recurring: true,
                    subscriptionId: subEntity.id,
                    renewalDate,
                });

                recordEvent(firstActivation ? 'SUBSCRIPTION' : 'SUBSCRIPTION_RENEWED', {
                    userId,
                    metadata: { plan: planType },
                });
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
