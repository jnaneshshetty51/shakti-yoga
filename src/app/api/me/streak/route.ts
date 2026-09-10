import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getStreak } from '@/lib/streak';

export const dynamic = 'force-dynamic';

/**
 * GET /api/me/streak — compact consistency numbers for the Home screen widget.
 * `currentStreakWeeks` = consecutive weeks (ending this or last week) with ≥1
 * attended class; `classesThisWeek` = attendance since Monday.
 */
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        return NextResponse.json(await getStreak(session.id), {
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error) {
        console.error('[me/streak] failed', error);
        return NextResponse.json({ currentStreakWeeks: 0, classesThisWeek: 0, attendedThisWeek: false });
    }
}
