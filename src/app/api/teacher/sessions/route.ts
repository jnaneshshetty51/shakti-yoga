import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTeacher } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { BookingStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const DAY = 86_400_000;

export async function GET() {
    const session = await requireTeacher();
    if (!session) return forbidden();

    const now = new Date();
    const [upcoming, past] = await Promise.all([
        prisma.booking.findMany({
            where: { teacherId: session.id, date: { gte: now }, status: { in: ['PENDING', 'CONFIRMED'] } },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { date: 'asc' },
        }),
        prisma.booking.findMany({
            where: { teacherId: session.id, date: { lt: now, gte: new Date(now.getTime() - 60 * DAY) } },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { date: 'desc' },
            take: 40,
        }),
    ]);

    const shape = (b: (typeof upcoming)[number]) => ({
        id: b.id,
        member: b.user?.name ?? 'Member',
        email: b.user?.email ?? '',
        type: b.type.replace(/_/g, ' ').toLowerCase(),
        status: b.status,
        at: b.date.toISOString(),
        notes: b.notes ?? '',
        hasLink: !!b.meetingLink,
    });

    return NextResponse.json({ upcoming: upcoming.map(shape), past: past.map(shape) });
}

/** Teacher updates their own session: post-session notes and/or outcome. */
export async function PATCH(request: Request) {
    const session = await requireTeacher();
    if (!session) return forbidden();

    try {
        const body = await request.json().catch(() => ({}));
        const id = typeof body.id === 'string' ? body.id : null;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const booking = await prisma.booking.findUnique({ where: { id }, select: { teacherId: true, status: true } });
        if (!booking || booking.teacherId !== session.id) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const data: { notes?: string; status?: BookingStatus } = {};
        if (typeof body.notes === 'string') data.notes = body.notes.slice(0, 2000);
        if (body.status && ['CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(body.status)) {
            data.status = body.status as BookingStatus;
        }
        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
        }

        const updated = await prisma.booking.update({ where: { id }, data });
        await recordAudit({
            actorId: session.id, actorEmail: session.email, ip: getClientIp(request),
            action: 'booking.teacher.update', entity: 'Booking', entityId: id,
            before: { status: booking.status }, after: { status: updated.status, notesSet: data.notes !== undefined },
        });
        return NextResponse.json({ success: true, status: updated.status });
    } catch (error) {
        console.error('[teacher] sessions PATCH error', error);
        return NextResponse.json({ error: 'Could not update the session' }, { status: 500 });
    }
}
