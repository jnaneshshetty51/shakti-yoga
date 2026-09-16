import { NextResponse } from 'next/server';
import { sendDueClassReminders } from '@/lib/class-reminders';

/**
 * Send "starts in 30 minutes" pushes for group classes and 1:1 sessions.
 * Run every 5-10 minutes — idempotent, so a shorter or overlapping interval
 * never double-sends. Protect with CRON_SECRET.
 *
 *   curl -H "x-cron-secret: $CRON_SECRET" https://host/api/cron/class-reminders
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
        const result = await sendDueClassReminders();
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        console.error('cron class-reminders failed:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
