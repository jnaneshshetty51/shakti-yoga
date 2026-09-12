import { prisma } from '@/lib/prisma';
import type { PlanType } from '@prisma/client';
import { posthogCapture } from '@/lib/posthog';

/** Server-side events. Legacy SCREAMING_CASE + the growth-funnel snake_case set. */
export type AppEvent =
    | 'SIGNUP'
    | 'TRIAL_START'
    | 'SUBSCRIPTION'
    | 'SUBSCRIPTION_RENEWED'
    | 'SUBSCRIPTION_CANCELLED'
    | 'BOOKING'
    | 'BOOKING_CANCELLED'
    | 'CLASS_JOIN'
    | 'PAYMENT_FAILED'
    | 'onboarding_completed'
    | 'class_booked'
    | 'class_joined'
    | 'practice_completed'
    | 'paywall_viewed'
    | 'checkout_started'
    | 'subscription_started'
    | 'subscription_renewed'
    | 'subscription_cancelled'
    | 'subscription_resumed'
    | 'referral_sent'
    | 'referral_converted'
    | 'family_joined'
    | 'push_opened'
    | 'content_viewed'
    | 'challenge_joined'
    | 'challenge_completed'
    | 'guide_message_sent';

/** Client-reported events allowed through /api/analytics/track. */
export const CLIENT_EVENTS = new Set<string>([
    'onboarding_completed',
    'paywall_viewed',
    'checkout_started',
    'content_viewed',
    'practice_completed',
    'challenge_joined',
    'push_opened',
    'referral_sent',
    'family_joined',
    'guide_message_sent',
    'app_opened',
]);

/** Fire-and-forget analytics event → local table + PostHog (if configured). Never throws. */
export async function recordEvent(
    eventType: AppEvent | string,
    opts: { userId?: string | null; metadata?: Record<string, unknown> } = {},
): Promise<void> {
    posthogCapture(opts.userId ?? 'anonymous', eventType, opts.metadata);
    try {
        await prisma.analyticsEvent.create({
            data: {
                eventType,
                userId: opts.userId ?? null,
                metadata: opts.metadata ? JSON.parse(JSON.stringify(opts.metadata)) : undefined,
            },
        });
    } catch (error) {
        console.error('[analytics] event failed', eventType, error);
    }
}

/** Record actual money in/out. Never throws. */
export async function recordRevenue(opts: {
    userId: string;
    amount: number; // major units (rupees)
    currency: string;
    planType: PlanType;
    provider?: string;
    providerId?: string;
    status?: 'SUCCESS' | 'FAILED' | 'REFUNDED';
}): Promise<void> {
    try {
        // A provider charge id maps to exactly one revenue row — guard against
        // webhook redelivery double-counting money.
        if (opts.providerId) {
            const existing = await prisma.revenueRecord.findFirst({
                where: { providerId: opts.providerId },
                select: { id: true },
            });
            if (existing) return;
        }
        await prisma.revenueRecord.create({
            data: {
                userId: opts.userId,
                amount: opts.amount,
                currency: opts.currency,
                planType: opts.planType,
                provider: opts.provider ?? 'razorpay',
                providerId: opts.providerId,
                status: opts.status ?? 'SUCCESS',
            },
        });
    } catch (error) {
        console.error('[analytics] revenue failed', opts.providerId, error);
    }
}
