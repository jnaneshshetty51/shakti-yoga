import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { recordEvent, CLIENT_EVENTS } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

/**
 * Batched event ingest from the mobile app (which has no PostHog SDK — keeps it
 * dependency-free / Expo Go safe). Accepts pre-auth events with an `anonId`.
 *
 *   POST { anonId?, events: [{ event, properties?, ts? }] }
 */
export async function POST(request: Request) {
    const session = await getSession();

    const body = await request.json().catch(() => ({}));
    const anonId = typeof body.anonId === 'string' ? body.anonId.slice(0, 64) : null;
    const distinctId = session?.id ?? anonId ?? 'anonymous';

    const { allowed } = rateLimit(`track:${distinctId}`, 120, 60 * 1000);
    if (!allowed) return NextResponse.json({ ok: true, dropped: true });

    const events = Array.isArray(body.events) ? body.events.slice(0, 50) : [];
    for (const e of events) {
        if (!e || typeof e.event !== 'string' || !CLIENT_EVENTS.has(e.event)) continue;
        const props =
            e.properties && typeof e.properties === 'object' && !Array.isArray(e.properties)
                ? { ...e.properties, platform: 'mobile', anon: !session }
                : { platform: 'mobile', anon: !session };
        void recordEvent(e.event, { userId: session?.id ?? null, metadata: props });
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
