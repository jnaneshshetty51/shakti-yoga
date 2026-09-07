import { NextResponse } from 'next/server';
import { runSubscriptionMaintenance } from '@/lib/subscription-maintenance';

/**
 * Reconcile family seats + apply scheduled downgrades. Protect with CRON_SECRET.
 *
 *   curl -H "x-cron-secret: $CRON_SECRET" https://host/api/cron/subscriptions
 */
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
    }
    if (request.headers.get('x-cron-secret') !== secret) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const result = await runSubscriptionMaintenance();
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        console.error('cron subscriptions failed:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
