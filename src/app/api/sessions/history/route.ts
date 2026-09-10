import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSessionBalance, listSessionHistory } from '@/lib/sessionCredits';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sessions/history — the member's per-class group-class attendance
 * (newest first) plus their live credit balance. Powers the mobile "Session
 * history" screen (EY-11) and the Progress tab's history view.
 */
export async function GET(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = Math.min(Number(new URL(request.url).searchParams.get('limit')) || 60, 200);

    const [balance, history] = await Promise.all([
        getSessionBalance(session.id),
        listSessionHistory(session.id, limit),
    ]);

    return NextResponse.json(
        { sessionCredits: balance, history },
        { headers: { 'Cache-Control': 'no-store' } },
    );
}
