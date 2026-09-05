import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { PLANS } from '@/lib/pricing';
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

        const subscription = await prisma.subscription.findFirst({
            where: { billingProviderId: subEntity.id },
            include: { user: true },
        });
        if (!subscription) {
            return NextResponse.json({ ok: true, note: 'subscription not found locally' });
        }

        switch (event.event) {
            case 'subscription.charged': {
                if (payEntity) {
                    // Idempotent on providerPaymentId (@unique).
                    const existing = await prisma.payment.findUnique({
                        where: { providerPaymentId: payEntity.id },
                    });
                    if (!existing) {
                        await prisma.payment.create({
                            data: {
                                userId: subscription.userId,
                                planType: subscription.planType,
                                amount: payEntity.amount / 100,
                                currency: payEntity.currency,
                                status: 'PAID',
                                provider: 'razorpay',
                                providerSubscriptionId: subEntity.id,
                                providerPaymentId: payEntity.id,
                            },
                        });
                    }
                }

                const renewalDate = subEntity.current_end
                    ? new Date(subEntity.current_end * 1000)
                    : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; })();

                const plan = planConfigForDbType(subscription.planType);
                await prisma.$transaction([
                    prisma.subscription.update({
                        where: { id: subscription.id },
                        data: { status: 'ACTIVE', renewalDate },
                    }),
                    // Top up therapy credits for the new cycle.
                    ...(plan.credits > 0
                        ? [prisma.user.update({
                            where: { id: subscription.userId },
                            data: { credits: { increment: plan.credits } },
                        })]
                        : []),
                ]);
                break;
            }

            case 'subscription.cancelled':
            case 'subscription.halted':
            case 'subscription.completed': {
                await prisma.subscription.update({
                    where: { id: subscription.id },
                    data: { status: 'CANCELLED' },
                });
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
