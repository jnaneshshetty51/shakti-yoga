import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { toMinutes, rangesOverlap } from '@/lib/timeOverlap';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HM = /^([01]?\d|2[0-3]):[0-5]\d$/;

/**
 * Refuses a rule that would double-book a teacher: another active rule for
 * the same teacher, covering the same weekday or the same specific date,
 * whose time window overlaps. Cross-checking a weekly rule against a
 * specific-date rule that happens to fall on that weekday is out of scope —
 * this catches the common case of two overlapping rules of the same kind.
 */
async function assertNoAvailabilityConflict(params: {
    teacherId: string;
    dayOfWeek: string | null;
    date: Date | null;
    startTime: string;
    endTime: string;
    excludeId?: string;
}): Promise<string | null> {
    const { teacherId, dayOfWeek, date, startTime, endTime, excludeId } = params;
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);

    const others = await prisma.teacherAvailability.findMany({
        where: {
            teacherId,
            active: true,
            ...(excludeId ? { id: { not: excludeId } } : {}),
            ...(dayOfWeek ? { dayOfWeek } : date ? { date } : {}),
        },
        select: { startTime: true, endTime: true },
    });
    for (const other of others) {
        if (rangesOverlap(start, end, toMinutes(other.startTime), toMinutes(other.endTime))) {
            return `Overlaps this teacher's existing availability (${other.startTime}–${other.endTime}).`;
        }
    }
    return null;
}

export async function GET() {
    if (!(await requireDepartment(['TRAINER', 'THERAPIST']))) return forbidden();
    const [rules, teachers] = await Promise.all([
        prisma.teacherAvailability.findMany({
            include: { teacher: { select: { id: true, name: true } } },
            orderBy: [{ teacherId: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
        }),
        prisma.user.findMany({ where: { role: 'TEACHER' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ]);
    return NextResponse.json({
        rules: rules.map((r) => ({
            id: r.id,
            teacherId: r.teacherId,
            teacherName: r.teacher.name,
            dayOfWeek: r.dayOfWeek,
            date: r.date ? r.date.toISOString().slice(0, 10) : null,
            startTime: r.startTime,
            endTime: r.endTime,
            slotMinutes: r.slotMinutes,
            active: r.active,
        })),
        teachers,
    });
}

export async function POST(request: Request) {
    const admin = await requireDepartment(['TRAINER', 'THERAPIST']);
    if (!admin) return forbidden();
    try {
        const b = await request.json().catch(() => ({}));
        if (!b.teacherId) return NextResponse.json({ error: 'teacherId is required' }, { status: 400 });
        if (!HM.test(b.startTime ?? '') || !HM.test(b.endTime ?? '')) {
            return NextResponse.json({ error: 'startTime / endTime must be HH:MM (24h)' }, { status: 400 });
        }
        if (b.dayOfWeek && !DAYS.includes(b.dayOfWeek)) {
            return NextResponse.json({ error: 'dayOfWeek must be Mon..Sun' }, { status: 400 });
        }
        if (!b.dayOfWeek && !b.date) {
            return NextResponse.json({ error: 'Set either a weekday or a specific date' }, { status: 400 });
        }
        const slotMinutes = Math.min(120, Math.max(15, Math.trunc(Number(b.slotMinutes) || 45)));
        const dayOfWeek = b.dayOfWeek || null;
        const date = b.date ? new Date(`${b.date}T00:00:00.000Z`) : null;

        const active = b.active === undefined ? true : Boolean(b.active);
        if (active) {
            const conflict = await assertNoAvailabilityConflict({
                teacherId: b.teacherId, dayOfWeek, date, startTime: b.startTime, endTime: b.endTime,
            });
            if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });
        }

        const rule = await prisma.teacherAvailability.create({
            data: {
                teacherId: b.teacherId,
                dayOfWeek,
                date,
                startTime: b.startTime,
                endTime: b.endTime,
                slotMinutes,
                active,
            },
        });
        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'availability.create', entity: 'TeacherAvailability', entityId: rule.id, after: rule,
        });
        return NextResponse.json({ rule: { id: rule.id } });
    } catch (error) {
        console.error('Admin availability POST error:', error);
        return NextResponse.json({ error: 'Could not add availability' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const admin = await requireDepartment(['TRAINER', 'THERAPIST']);
    if (!admin) return forbidden();
    try {
        const b = await request.json().catch(() => ({}));
        if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        if ((b.startTime && !HM.test(b.startTime)) || (b.endTime && !HM.test(b.endTime))) {
            return NextResponse.json({ error: 'startTime / endTime must be HH:MM (24h)' }, { status: 400 });
        }
        if (b.dayOfWeek && !DAYS.includes(b.dayOfWeek)) {
            return NextResponse.json({ error: 'dayOfWeek must be Mon..Sun' }, { status: 400 });
        }
        const before = await prisma.teacherAvailability.findUnique({ where: { id: String(b.id) } });
        if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const data: Record<string, unknown> = {};
        if (b.startTime) data.startTime = b.startTime;
        if (b.endTime) data.endTime = b.endTime;
        if (b.dayOfWeek !== undefined) data.dayOfWeek = b.dayOfWeek || null;
        if (b.date !== undefined) data.date = b.date ? new Date(`${b.date}T00:00:00.000Z`) : null;
        if (b.slotMinutes !== undefined) data.slotMinutes = Math.min(120, Math.max(15, Math.trunc(Number(b.slotMinutes) || 45)));
        if (b.active !== undefined) data.active = Boolean(b.active);

        const resultingActive = (data.active as boolean) ?? before.active;
        if (resultingActive) {
            const conflict = await assertNoAvailabilityConflict({
                teacherId: before.teacherId,
                dayOfWeek: (data.dayOfWeek as string | null) ?? before.dayOfWeek,
                date: (data.date as Date | null) ?? before.date,
                startTime: (data.startTime as string) ?? before.startTime,
                endTime: (data.endTime as string) ?? before.endTime,
                excludeId: String(b.id),
            });
            if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });
        }

        const rule = await prisma.teacherAvailability.update({ where: { id: String(b.id) }, data });
        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'availability.update', entity: 'TeacherAvailability', entityId: rule.id,
            before: { startTime: before.startTime, endTime: before.endTime, dayOfWeek: before.dayOfWeek, active: before.active },
            after: data,
        });
        return NextResponse.json({ rule: { id: rule.id } });
    } catch (error) {
        console.error('Admin availability PATCH error:', error);
        return NextResponse.json({ error: 'Could not update availability' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const admin = await requireDepartment(['TRAINER', 'THERAPIST']);
    if (!admin) return forbidden();
    try {
        const id = new URL(request.url).searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        await prisma.teacherAvailability.delete({ where: { id } });
        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'availability.delete', entity: 'TeacherAvailability', entityId: id,
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin availability DELETE error:', error);
        return NextResponse.json({ error: 'Could not delete availability' }, { status: 500 });
    }
}
