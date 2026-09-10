import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTeacher } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { applyAttendance, type AttendanceDecision } from '@/lib/sessionCredits';

export const dynamic = 'force-dynamic';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const DAY = 86_400_000;

/** The teacher who owns this instance's batch, or null if the caller may not touch it. */
async function loadInstanceForTeacher(instanceId: string, session: { id: string; role: string }) {
    const instance = await prisma.classInstance.findUnique({
        where: { id: instanceId },
        include: { batch: { select: { name: true, teacherId: true, durationMin: true } } },
    });
    if (!instance) return { error: NextResponse.json({ error: 'Class not found' }, { status: 404 }) };
    if (session.role !== 'admin' && instance.batch.teacherId !== session.id) {
        return { error: forbidden() };
    }
    return { instance };
}

/** GET — the roster for one class instance: who checked in and their confirmed state. */
export async function GET(_req: Request, props: { params: Promise<{ instanceId: string }> }) {
    const session = await requireTeacher();
    if (!session) return forbidden();

    const { instanceId } = await props.params;
    const loaded = await loadInstanceForTeacher(instanceId, session);
    if (loaded.error) return loaded.error;
    const { instance } = loaded;

    const rows = await prisma.classAttendance.findMany({
        where: { classInstanceId: instanceId },
        select: {
            id: true,
            status: true,
            joinedAt: true,
            addedByTeacher: true,
            confirmedAt: true,
            user: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ status: 'asc' }, { joinedAt: 'asc' }],
    });

    const end = instance.date.getTime() + instance.batch.durationMin * 60_000;

    return NextResponse.json({
        instance: {
            id: instance.id,
            batchName: instance.batch.name,
            startsAt: instance.date.toISOString(),
            status: instance.status,
        },
        // Attendance can be finalised from class start until 48h after it ends.
        window: { opensAt: instance.date.toISOString(), closesAt: new Date(end + 2 * DAY).toISOString() },
        roster: rows.map((r) => ({
            attendanceId: r.id,
            userId: r.user.id,
            name: r.user.name,
            email: r.user.email,
            status: r.status,
            checkedInAt: r.joinedAt.toISOString(),
            addedByTeacher: r.addedByTeacher,
            confirmed: r.confirmedAt != null,
        })),
    });
}

/**
 * POST — the teacher finalises attendance.
 * Body: { decisions: [{ userId, status: 'PRESENT' | 'ABSENT' }], finalize?: boolean }
 * `finalize: true` marks every still-unconfirmed check-in as PRESENT.
 */
export async function POST(request: Request, props: { params: Promise<{ instanceId: string }> }) {
    const session = await requireTeacher();
    if (!session) return forbidden();

    const { instanceId } = await props.params;
    const loaded = await loadInstanceForTeacher(instanceId, session);
    if (loaded.error) return loaded.error;
    const { instance } = loaded;

    const end = instance.date.getTime() + instance.batch.durationMin * 60_000;
    if (Date.now() < instance.date.getTime()) {
        return NextResponse.json({ error: 'The class has not started yet.' }, { status: 409 });
    }
    if (Date.now() > end + 2 * DAY) {
        return NextResponse.json(
            { error: 'Attendance for this class is locked. Ask an admin to make a correction.' },
            { status: 409 },
        );
    }

    const body = await request.json().catch(() => ({}));
    const decisions: AttendanceDecision[] = [];

    if (Array.isArray(body.decisions)) {
        for (const d of body.decisions) {
            if (
                d &&
                typeof d.userId === 'string' &&
                (d.status === 'PRESENT' || d.status === 'ABSENT')
            ) {
                decisions.push({ userId: d.userId, status: d.status });
            }
        }
    }

    if (body.finalize === true) {
        const pending = await prisma.classAttendance.findMany({
            where: { classInstanceId: instanceId, status: 'CHECKED_IN' },
            select: { userId: true },
        });
        const named = new Set(decisions.map((d) => d.userId));
        for (const p of pending) {
            if (!named.has(p.userId)) decisions.push({ userId: p.userId, status: 'PRESENT' });
        }
    }

    if (decisions.length === 0) {
        return NextResponse.json({ error: 'No attendance changes supplied.' }, { status: 400 });
    }

    const { confirmed } = await applyAttendance(instanceId, decisions, session.id);

    await recordAudit({
        actorId: session.id,
        actorEmail: session.email,
        ip: getClientIp(request),
        action: 'class.attendance.confirm',
        entity: 'ClassInstance',
        entityId: instanceId,
        after: { confirmed, finalize: body.finalize === true },
    });

    return NextResponse.json({ confirmed });
}
