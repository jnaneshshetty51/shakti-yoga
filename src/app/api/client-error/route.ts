import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

/** Minimal client-error sink — logs to the server so PM2 logs capture front-end crashes. */
export async function POST(request: Request) {
    const { allowed } = rateLimit(`client-error:${getClientIp(request)}`, 20, 60 * 1000);
    if (!allowed) return NextResponse.json({ ok: true });

    try {
        const body = await request.json().catch(() => ({}));
        const msg = String(body.message ?? '').slice(0, 500);
        const path = String(body.path ?? '').slice(0, 200);
        const digest = String(body.digest ?? '').slice(0, 100);
        console.error(`[client-error] ${path} :: ${msg}${digest ? ` (${digest})` : ''}`);
    } catch {
        // ignore
    }
    return NextResponse.json({ ok: true });
}
