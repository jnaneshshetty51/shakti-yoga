import { prisma } from '@/lib/prisma';
import { PLANS } from '@/lib/pricing';
import { istParts, istToUtc } from '@/lib/class-schedule';

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const WEEKDAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * IST midnight of the Monday starting the week that contains `d`. Classes run
 * on IST wall-clock time (see class-schedule.ts) — a UTC week boundary would
 * bucket an early-morning IST class into the wrong week for the first ~5.5
 * hours of every IST day.
 */
function weekStart(d: Date): number {
    const { year, month1, day, weekday } = istParts(d);
    const dow = (WEEKDAY_ORDER.indexOf(weekday) + 6) % 7; // 0 = Monday
    return istToUtc(year, month1, day - dow, 0, 0).getTime();
}

export interface StreakSummary {
    /** Consecutive weeks (ending this or last week) with ≥1 attended class. */
    currentStreakWeeks: number;
    /** Classes attended since Monday. */
    classesThisWeek: number;
    attendedThisWeek: boolean;
    /** Weekly live-class cap for MEMBER_STARTER, else null. */
    starterLimit: number | null;
}

/**
 * Compact consistency numbers for the Home screen widget. Throws on a DB error —
 * callers decide the fallback.
 */
export async function getStreak(userId: string): Promise<StreakSummary> {
    const since = new Date(Date.now() - 30 * WEEK);
    const rows = await prisma.classAttendance.findMany({
        where: { userId, joinedAt: { gte: since } },
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

    const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const starterLimit =
        me?.role === 'MEMBER_STARTER' ? (PLANS.starter.weeklyClassLimit ?? 2) : null;

    return {
        currentStreakWeeks: current,
        classesThisWeek,
        attendedThisWeek: classesThisWeek > 0,
        starterLimit,
    };
}
