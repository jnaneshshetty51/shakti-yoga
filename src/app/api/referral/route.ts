import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { referralStats } from '@/lib/referral';

export const dynamic = 'force-dynamic';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://shaktiyoga.in').replace(/\/$/, '');

/** GET /api/referral — the caller's code, share link and stats. */
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const s = await referralStats(session.id);
    return NextResponse.json(
        {
            ...s,
            link: `${APP_URL}/r/${s.code}`,
            message:
                `I've been practising with Shakti Yoga — live classes every day + 1:1 yoga therapy. ` +
                `Use my code ${s.code} and your first month is on me: ${APP_URL}/r/${s.code}`,
        },
        { headers: { 'Cache-Control': 'no-store' } },
    );
}
