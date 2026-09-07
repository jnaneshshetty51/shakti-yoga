import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTeacher } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const DAY = 86_400_000;

const RATE_KEYS = { class: 'teacher_rate_class', session: 'teacher_rate_session' } as const;
const RATE_DEFAULTS = { class: 500, session: 800 };

function monthKey(d: Date) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(key: string) {
    const [y, m] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export async function GET() {
    const session = await requireTeacher();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const teacherId = session.id;
    const now = new Date();
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)); // start of 6-month window

    try {
        const [rateRows, classInstances, bookings, attendance, teacherBookingUsers] = await Promise.all([
            prisma.setting.findMany({ where: { key: { in: [RATE_KEYS.class, RATE_KEYS.session] } } }),
            prisma.classInstance.findMany({
                where: { batch: { teacherId }, status: 'Completed', date: { gte: since } },
                select: { date: true },
            }),
            prisma.booking.findMany({
                where: { teacherId, status: 'COMPLETED', date: { gte: since } },
                select: { date: true },
            }),
            prisma.classAttendance.findMany({
                where: { classInstance: { batch: { teacherId } } },
                select: { userId: true, joinedAt: true },
            }),
            prisma.booking.findMany({
                where: { teacherId },
                select: { userId: true, status: true, date: true },
            }),
        ]);

        const rateFor = (which: keyof typeof RATE_DEFAULTS) => {
            const row = rateRows.find((r) => r.key === RATE_KEYS[which]);
            const n = row ? Number(row.value) : NaN;
            return Number.isFinite(n) && n >= 0 ? n : RATE_DEFAULTS[which];
        };
        const rates = { class: rateFor('class'), session: rateFor('session') };

        // ---- month breakdown ----
        const months: Record<string, { classes: number; sessions: number }> = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
            months[monthKey(d)] = { classes: 0, sessions: 0 };
        }
        for (const c of classInstances) {
            const k = monthKey(c.date);
            if (months[k]) months[k].classes += 1;
        }
        for (const b of bookings) {
            const k = monthKey(b.date);
            if (months[k]) months[k].sessions += 1;
        }
        const monthList = Object.entries(months).map(([key, v]) => ({
            key,
            label: monthLabel(key),
            classes: v.classes,
            sessions: v.sessions,
            payout: v.classes * rates.class + v.sessions * rates.session,
        }));

        const thisKey = monthKey(now);
        const lastKey = monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
        const thisMonth = monthList.find((m) => m.key === thisKey);
        const lastMonth = monthList.find((m) => m.key === lastKey);

        const totalClasses = monthList.reduce((s, m) => s + m.classes, 0);
        const totalSessions = monthList.reduce((s, m) => s + m.sessions, 0);

        // ---- roster ----
        type RosterAgg = { classes: number; sessions: number; lastSeen: number };
        const agg = new Map<string, RosterAgg>();
        const bump = (userId: string, patch: Partial<RosterAgg>, seen?: Date) => {
            const cur = agg.get(userId) ?? { classes: 0, sessions: 0, lastSeen: 0 };
            cur.classes += patch.classes ?? 0;
            cur.sessions += patch.sessions ?? 0;
            if (seen) cur.lastSeen = Math.max(cur.lastSeen, seen.getTime());
            agg.set(userId, cur);
        };
        for (const a of attendance) bump(a.userId, { classes: 1 }, a.joinedAt);
        for (const b of teacherBookingUsers) {
            if (b.status === 'COMPLETED' || b.status === 'CONFIRMED') bump(b.userId, { sessions: 1 }, b.date);
        }

        const rosterIds = [...agg.keys()];
        const users = rosterIds.length
            ? await prisma.user.findMany({
                where: { id: { in: rosterIds } },
                select: { id: true, name: true, email: true, role: true, subscription: { select: { planType: true } } },
            })
            : [];
        const roster = users
            .map((u) => {
                const a = agg.get(u.id)!;
                return {
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    plan: u.subscription?.planType.replace(/_/g, ' ').toLowerCase() ?? u.role.replace(/_/g, ' ').toLowerCase(),
                    classes: a.classes,
                    sessions: a.sessions,
                    lastSeen: a.lastSeen ? new Date(a.lastSeen).toISOString() : null,
                };
            })
            .sort((x, y) => (y.lastSeen ?? '').localeCompare(x.lastSeen ?? ''));

        return NextResponse.json(
            {
                generatedAt: now.toISOString(),
                rates,
                months: monthList,
                totals: {
                    classes: totalClasses,
                    sessions: totalSessions,
                    payout: totalClasses * rates.class + totalSessions * rates.session,
                    thisMonthPayout: thisMonth?.payout ?? 0,
                    lastMonthPayout: lastMonth?.payout ?? 0,
                    windowDays: Math.round((now.getTime() - since.getTime()) / DAY),
                },
                roster,
            },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        console.error('[teacher] earnings failed', error);
        return NextResponse.json({ error: 'Failed to load earnings' }, { status: 500 });
    }
}
