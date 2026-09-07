import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/** UTC midnight of the Monday starting the week that contains `d`. */
function weekStart(d: Date): number {
    const x = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const dow = (new Date(x).getUTCDay() + 6) % 7; // 0 = Monday
    return x - dow * DAY;
}

/**
 * GET /api/me/streak — compact consistency numbers for the Home screen widget.
 * `currentStreakWeeks` = consecutive weeks (ending this or last week) with ≥1
 * attended class; `classesThisWeek` = attendance since Monday.
 */
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const since = new Date(Date.now() - 30 * WEEK);
        const rows = await prisma.classAttendance.findMany({
            where: { userId: session.id, joinedAt: { gte: since } },
            select: { joinedAt: true },
        });

        const weeks = new Set(rows.map((r) => weekStart(r.joinedAt)));
        const thisWeek = weekStart(new Date());

        let current = 0;
        let cursor = weeks.has(thisWeek) ? thisWeek : thisWeek - WEEK;
        while (weeks.has(cursor)) {
            current += 1;
            cursor -= WEEK;
        }

        const classesThisWeek = rows.filter((r) => weekStart(r.joinedAt) === thisWeek).length;

        return NextResponse.json(
            { currentStreakWeeks: current, classesThisWeek, attendedThisWeek: classesThisWeek > 0 },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        console.error('[me/streak] failed', error);
        return NextResponse.json({ currentStreakWeeks: 0, classesThisWeek: 0, attendedThisWeek: false });
    }
}
