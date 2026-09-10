import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { applyRcEvent, type RcEvent } from '@/lib/revenuecat';

export const dynamic = 'force-dynamic';

/**
 * RevenueCat webhook. Configure the endpoint in RevenueCat → Project settings →
 * Integrations → Webhooks, with an Authorization header value that matches
 * REVENUECAT_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!secret) {
        return NextResponse.json({ error: 'RevenueCat webhook not configured' }, { status: 503 });
    }
    const auth = request.headers.get('authorization') ?? '';
    if (auth !== secret && auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as { event?: RcEvent } | null;
    const event = body?.event;
    if (!event || typeof event.type !== 'string') {
        return NextResponse.json({ error: 'Malformed event' }, { status: 400 });
    }

    // Idempotency: RevenueCat retries deliveries, and applyRcEvent has side
    // effects that must not run twice (credit grants, revenue rows, renewalDate).
    // Claim the event id first; a unique-constraint hit means we already handled it.
    if (event.id) {
        try {
            await prisma.processedWebhookEvent.create({
                data: { provider: 'revenuecat', eventId: event.id, eventType: event.type },
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                return NextResponse.json({ ok: true, note: 'duplicate' });
            }
            throw e;
        }
    } else {
        console.warn('[revenuecat] event has no id — processing without idempotency guard');
    }

    try {
        const result = await applyRcEvent(event);
        console.log(`[revenuecat] ${event.type} ${event.app_user_id} -> ${result}`);
        return NextResponse.json({ ok: true, result });
    } catch (error) {
        console.error('[revenuecat] handler failed', event.type, error);
        // Release the idempotency claim so RevenueCat's retry can reprocess.
        if (event.id) {
            await prisma.processedWebhookEvent
                .deleteMany({ where: { provider: 'revenuecat', eventId: event.id } })
                .catch(() => {});
        }
        // 500 so RevenueCat retries.
        return NextResponse.json({ error: 'Handler error' }, { status: 500 });
    }
}
