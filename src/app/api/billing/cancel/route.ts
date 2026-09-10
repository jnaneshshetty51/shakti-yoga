import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { cancelSubscription } from '@/lib/razorpay';
import { priceFor, regionFor } from '@/lib/pricing';
import { resolvedPlan } from '@/lib/plans';
import { recordEvent } from '@/lib/analytics';
import { posthogCapture } from '@/lib/posthog';

const IAP_MANAGE = {
    apple: 'https://apps.apple.com/account/subscriptions',
    google: 'https://play.google.com/store/account/subscriptions',
};

/**
 * POST /api/billing/cancel { intent?: 'cancel' | 'pause' | 'downgrade', reason? }
 *  - cancel: stop at cycle end (access runs to renewalDate)
 *  - pause: same, but marks pausedAt so the app can offer a one-tap resume
 *  - downgrade: schedule Everyday → Starter at the next renewal
 * Store-billed (Apple/Google) subs can't be changed server-side — returns a
 * manageUrl for the app to open.
 */
export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const intent = ['cancel', 'pause', 'downgrade'].includes(body.intent) ? body.intent : 'cancel';
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 200) : null;

    const sub = await prisma.subscription.findUnique({ where: { userId: session.id } });
    if (!sub) return NextResponse.json({ error: 'No active subscription' }, { status: 404 });

    if (sub.provider === 'apple' || sub.provider === 'google') {
        return NextResponse.json({
            storeManaged: true,
            manageUrl: IAP_MANAGE[sub.provider],
            message: `This membership is billed through ${sub.provider === 'apple' ? 'the App Store' : 'Google Play'}. Manage or cancel it there — your access stays until the current period ends.`,
        });
    }

    if (intent === 'downgrade') {
        if (sub.planType !== 'EVERYDAY_YOGA') {
            return NextResponse.json({ error: 'Only Everyday plans can switch to Starter.' }, { status: 400 });
        }
        const starter = await resolvedPlan('starter');
        const price = priceFor(starter, regionFor(sub.currency));
        await prisma.subscription.update({ where: { userId: session.id }, data: { pendingPlanKey: 'starter' } });
        recordEvent('subscription_cancelled', { userId: session.id, metadata: { intent, reason, to: 'starter' } });
        return NextResponse.json({
            scheduled: true,
            message: `You'll move to Starter (${price.currency === 'USD' ? '$' : '₹'}${price.amount}/mo, ${starter.weeklyClassLimit} live classes a week) when your current period ends on ${sub.renewalDate.toISOString().slice(0, 10)}.`,
        });
    }

    if (sub.recurring && sub.billingProviderId) {
        try {
            await cancelSubscription(sub.billingProviderId, true);
        } catch (err) {
            console.error('Razorpay cancel failed (continuing):', err);
        }
    }

    const updated = await prisma.subscription.update({
        where: { userId: session.id },
        data: {
            status: 'CANCELLED',
            recurring: false,
            pendingPlanKey: null,
            pausedAt: intent === 'pause' ? new Date() : null,
        },
    });

    recordEvent('subscription_cancelled', { userId: session.id, metadata: { intent, reason } });
    posthogCapture(session.id, 'subscription_cancelled', { intent, reason });

    return NextResponse.json({
        subscription: updated,
        message:
            intent === 'pause'
                ? `Paused. Your practice stays open until ${updated.renewalDate.toISOString().slice(0, 10)} — resume any time before then and nothing changes.`
                : `Cancelled. You have full access until ${updated.renewalDate.toISOString().slice(0, 10)}.`,
    });
}
