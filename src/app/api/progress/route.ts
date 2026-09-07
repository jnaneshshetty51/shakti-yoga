import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/** ISO date (UTC) of the Monday that starts the week containing `d`. */
function weekStart(d: Date): Date {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dow = (x.getUTCDay() + 6) % 7; // 0 = Monday
    return new Date(x.getTime() - dow * DAY);
}

export async function GET() {
    const payload = await getSession();
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = payload.id;
    const now = new Date();
    const since = new Date(now.getTime() - 12 * WEEK);

    try {
        const [user, attendance, allAttendanceDates, sessions] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true, credits: true } }),
            prisma.classAttendance.findMany({
                where: { userId, joinedAt: { gte: since } },
                select: { joinedAt: true },
                orderBy: { joinedAt: 'asc' },
            }),
            prisma.classAttendance.findMany({
                where: { userId },
                select: { joinedAt: true },
            }),
            prisma.booking.findMany({
                where: { userId, type: 'THERAPY_SESSION' },
                select: { id: true, date: true, status: true, notes: true, teacher: { select: { name: true } } },
                orderBy: { date: 'desc' },
                take: 20,
            }),
        ]);

        // ---- weekly series (last 8 weeks) ----
        const weeks: { key: string; label: string; count: number }[] = [];
        for (let i = 7; i >= 0; i--) {
            const ws = weekStart(new Date(now.getTime() - i * WEEK));
            weeks.push({
                key: ws.toISOString().slice(0, 10),
                label: ws.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                count: 0,
            });
        }
        const weekIndex = new Map(weeks.map((w, i) => [w.key, i]));
        for (const a of attendance) {
            const k = weekStart(a.joinedAt).toISOString().slice(0, 10);
            const idx = weekIndex.get(k);
            if (idx !== undefined) weeks[idx].count += 1;
        }

        // ---- streaks (consecutive weeks with >=1 attendance, all-time) ----
        const attendedWeeks = new Set(allAttendanceDates.map((a) => weekStart(a.joinedAt).getTime()));
        const sortedWeeks = [...attendedWeeks].sort((a, b) => a - b);
        let longest = 0;
        let run = 0;
        let prev: number | null = null;
        for (const w of sortedWeeks) {
            run = prev !== null && w - prev === WEEK ? run + 1 : 1;
            longest = Math.max(longest, run);
            prev = w;
        }
        // current streak: count back from this week / last week
        const thisWeek = weekStart(now).getTime();
        let current = 0;
        let cursor = attendedWeeks.has(thisWeek) ? thisWeek : thisWeek - WEEK;
        while (attendedWeeks.has(cursor)) {
            current += 1;
            cursor -= WEEK;
        }

        // ---- month over month ----
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const thisMonthCount = allAttendanceDates.filter((a) => a.joinedAt >= monthStart).length;
        const lastMonthCount = allAttendanceDates.filter(
            (a) => a.joinedAt >= lastMonthStart && a.joinedAt < monthStart,
        ).length;

        const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');

        return NextResponse.json(
            {
                generatedAt: now.toISOString(),
                memberSince: user?.createdAt.toISOString() ?? null,
                credits: user?.credits ?? 0,
                totals: {
                    classesAllTime: allAttendanceDates.length,
                    classesThisMonth: thisMonthCount,
                    classesLastMonth: lastMonthCount,
                    sessionsCompleted: completedSessions.length,
                    currentStreakWeeks: current,
                    longestStreakWeeks: longest,
                },
                weeks,
                sessions: sessions.map((s) => ({
                    id: s.id,
                    at: s.date.toISOString(),
                    status: s.status,
                    teacher: s.teacher?.name ?? '—',
                    notes: s.notes,
                })),
            },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        console.error('[progress] failed', error);
        return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 });
    }
}
