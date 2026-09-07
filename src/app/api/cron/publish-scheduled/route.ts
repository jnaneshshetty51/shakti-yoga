import { NextResponse } from 'next/server';
import { publishScheduledContent } from '@/lib/content-schedule';

/**
 * Publish due scheduled Content. Protect with CRON_SECRET.
 *
 *   curl -H "x-cron-secret: $CRON_SECRET" https://host/api/cron/publish-scheduled
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
        const published = await publishScheduledContent();
        return NextResponse.json({ ok: true, published });
    } catch (error) {
        console.error('cron publish-scheduled failed:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
