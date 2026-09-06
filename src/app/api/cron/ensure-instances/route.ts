import { NextResponse } from 'next/server';
import { ensureInstances } from '@/lib/class-schedule';

/**
 * Backup trigger for instance materialisation, for environments that would rather
 * hit an HTTP endpoint than run the script. Protect with CRON_SECRET.
 *
 *   curl -H "x-cron-secret: $CRON_SECRET" https://host/api/cron/ensure-instances
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
        const created = await ensureInstances(14);
        return NextResponse.json({ ok: true, created });
    } catch (error) {
        console.error('cron ensure-instances failed:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
