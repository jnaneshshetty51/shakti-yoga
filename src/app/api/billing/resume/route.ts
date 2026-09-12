import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { recordEvent } from '@/lib/analytics';
import { posthogCapture } from '@/lib/posthog';

/**
 * POST /api/billing/resume — undo a pending pause before it lapses.
 *
 * Resuming does NOT revive the cancelled Razorpay mandate — pausing already
 * stopped recurring billing the same way cancelling does. This just flips
 * the status back to ACTIVE and clears pausedAt so the member keeps access
 * without interruption; they'll need a fresh checkout at the next renewal
 * date to keep going, same as anyone who un-cancels shortly before their
 * period ends. Only valid while still PAUSED and before renewalDate passes.
 */
export async function POST() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sub = await prisma.subscription.findUnique({ where: { userId: session.id } });
    if (!sub) return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    if (sub.status !== 'PAUSED') {
        return NextResponse.json({ error: 'This subscription is not paused.' }, { status: 400 });
    }
    if (sub.renewalDate.getTime() < Date.now()) {
        return NextResponse.json({ error: 'Your paused period has already ended — please check out again to continue.' }, { status: 400 });
    }

    const updated = await prisma.subscription.update({
        where: { userId: session.id },
        data: { status: 'ACTIVE', pausedAt: null },
    });

    recordEvent('subscription_resumed', { userId: session.id });
    posthogCapture(session.id, 'subscription_resumed', {});

    return NextResponse.json({
        subscription: updated,
        message: `Resumed. Your practice stays open until ${updated.renewalDate.toISOString().slice(0, 10)} — you'll need to check out again to continue past that date, since we stopped automatic billing when you paused.`,
    });
}
