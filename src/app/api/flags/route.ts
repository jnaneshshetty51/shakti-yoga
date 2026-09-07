import { NextResponse } from 'next/server';
import { getFlags } from '@/lib/flags';

export const dynamic = 'force-dynamic';

/** GET /api/flags — runtime config for the app (paywall, IAP toggle, A/B). */
export async function GET() {
    const flags = await getFlags();
    return NextResponse.json(flags, {
        headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    });
}
