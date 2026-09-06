import { prisma } from '@/lib/prisma';
import type { PlanType } from '@prisma/client';

export type AppEvent =
    | 'SIGNUP'
    | 'TRIAL_START'
    | 'SUBSCRIPTION'
    | 'SUBSCRIPTION_RENEWED'
    | 'SUBSCRIPTION_CANCELLED'
    | 'BOOKING'
    | 'BOOKING_CANCELLED'
    | 'CLASS_JOIN'
    | 'PAYMENT_FAILED';

/** Fire-and-forget analytics event. Never throws. */
export async function recordEvent(
    eventType: AppEvent,
    opts: { userId?: string | null; metadata?: Record<string, unknown> } = {},
): Promise<void> {
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
