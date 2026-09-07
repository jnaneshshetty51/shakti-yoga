import { NextResponse } from 'next/server';
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

    try {
        const result = await applyRcEvent(event);
        console.log(`[revenuecat] ${event.type} ${event.app_user_id} -> ${result}`);
        return NextResponse.json({ ok: true, result });
    } catch (error) {
        console.error('[revenuecat] handler failed', event.type, error);
        // 500 so RevenueCat retries.
        return NextResponse.json({ error: 'Handler error' }, { status: 500 });
    }
}
