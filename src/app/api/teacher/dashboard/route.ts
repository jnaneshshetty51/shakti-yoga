import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTeacher } from '@/lib/admin-auth';
import { ensureInstances, resolveMeetingLink, isJoinable, istParts } from '@/lib/class-schedule';

export const dynamic = 'force-dynamic';

const DAY = 86_400_000;

export async function GET() {
    const session = await requireTeacher();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const teacherId = session.id;
    const now = new Date();

    // Materialise the next couple of days of group-class instances so today's
    // class always shows even if the cron hasn't run.
    try {
        await ensureInstances(2);
    } catch (e) {
        console.error('[teacher] ensureInstances failed', e);
    }

    const in7 = new Date(now.getTime() + 7 * DAY);
    const ago7 = new Date(now.getTime() - 7 * DAY);
    const since3h = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    try {
        const [batches, instances, sessions, notesPending, weekInstances] = await Promise.all([
            prisma.classBatch.count({ where: { teacherId, active: true } }),
            prisma.classInstance.findMany({
                where: { batch: { teacherId }, date: { gte: since3h, lt: in7 }, status: { not: 'Cancelled' } },
                include: { batch: { select: { name: true, durationMin: true, meetingLink: true } } },
                orderBy: { date: 'asc' },
            }),
            prisma.booking.findMany({
                where: { teacherId, date: { gte: now, lt: in7 }, status: { in: ['PENDING', 'CONFIRMED'] } },
                include: { user: { select: { name: true, email: true } } },
                orderBy: { date: 'asc' },
            }),
            prisma.booking.findMany({
                where: { teacherId, status: 'COMPLETED', notes: null, date: { gte: ago7 } },
                include: { user: { select: { name: true } } },
                orderBy: { date: 'desc' },
                take: 10,
            }),
            prisma.classInstance.findMany({
                where: { batch: { teacherId }, date: { gte: ago7, lt: now } },
                select: { attendanceCount: true },
            }),
        ]);

        const today = istParts(now);
        const isToday = (d: Date) => {
            const p = istParts(d);
            return p.year === today.year && p.month1 === today.month1 && p.day === today.day;
        };

        return NextResponse.json(
            {
                generatedAt: now.toISOString(),
                teacher: { name: session.name ?? 'Teacher' },
                stats: {
                    batches,
                    classesToday: instances.filter((i) => isToday(i.date)).length,
                    sessionsThisWeek: sessions.length,
                    attendanceThisWeek: weekInstances.reduce((s, i) => s + i.attendanceCount, 0),
                    notesToWrite: notesPending.length,
                },
                classes: instances.map((i) => ({
                    id: i.id,
                    name: i.batch.name,
                    at: i.date.toISOString(),
                    today: isToday(i.date),
                    joinable: isJoinable(i, { durationMin: i.batch.durationMin }, now),
                    meetingLink: resolveMeetingLink(i),
                    ownLink: !!i.meetingLink,
                    attendanceCount: i.attendanceCount,
                    status: i.status,
                })),
                sessions: sessions.map((b) => ({
                    id: b.id,
                    member: b.user?.name ?? 'Member',
                    email: b.user?.email ?? '',
                    type: b.type.replace(/_/g, ' ').toLowerCase(),
                    at: b.date.toISOString(),
                    status: b.status,
                    hasLink: !!b.meetingLink,
                })),
                notesToWrite: notesPending.map((b) => ({
                    id: b.id,
                    member: b.user?.name ?? 'Member',
                    at: b.date.toISOString(),
                })),
            },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        console.error('[teacher] dashboard failed', error);
        return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
    }
}
