import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { referralStats } from '@/lib/referral';

export const dynamic = 'force-dynamic';

/** GET /api/referral — the caller's code, share link, ₹ credit balance and referral list. */
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const stats = await referralStats(session.id);
    return NextResponse.json(stats, { headers: { 'Cache-Control': 'no-store' } });
}
