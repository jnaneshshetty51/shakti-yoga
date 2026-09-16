import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { eligibleEverydayMembers } from '@/lib/class-access';
import { assertNoInstanceConflict } from '@/lib/class-schedule';
import { sendEmail, emailLayout } from '@/lib/email';
import { sendPush } from '@/lib/push';
import { Role } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });
const INSTANCE_STATUSES = ['Scheduled', 'Completed', 'Cancelled'];

export async function GET(request: Request) {
    try {
        const payload = await requireDepartment(['TRAINER']);
        if (!payload) return forbidden();

        // A 7-day window starting from ?start= (YYYY-MM-DD), defaulting to today,
        // so the page can page backward/forward instead of only ever showing
        // "the next 7 days from right now."
        const startParam = new URL(request.url).searchParams.get('start');
        const startDate = startParam && !Number.isNaN(Date.parse(startParam)) ? new Date(startParam) : new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);

        const instances = await prisma.classInstance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                teacher: { select: { id: true, name: true } },
                batch: {
                    include: {
                        teacher: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
            orderBy: {
                date: 'asc',
            },
        });

        // Group by day of week
        interface ScheduleEntry {
            id: string;
            batchName: string;
            timeSlot: string;
            teacher: string;
            teacherId: string;
            isSubstitute: boolean;
            status: string;
            attendanceCount: number;
            capacity: number | null;
            meetingLink: string; // per-instance override, '' when it falls back to the batch link
            batchMeetingLink: string;
            date: string;
            openAccess: boolean;
        }
        const scheduleByDay: Record<string, ScheduleEntry[]> = {
            'Mon': [],
            'Tue': [],
            'Wed': [],
            'Thu': [],
            'Fri': [],
            'Sat': [],
            'Sun': [],
        };

        instances.forEach(instance => {
            const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' }).format(instance.date);
            const dayKey = dayName as keyof typeof scheduleByDay;

            if (scheduleByDay[dayKey]) {
                scheduleByDay[dayKey].push({
                    id: instance.id,
                    batchName: instance.batch.name,
                    timeSlot: formatTimeSlot(instance.date, instance.batch.durationMin),
                    teacher: instance.teacher?.name ?? instance.batch.teacher.name,
                    teacherId: instance.teacherId ?? instance.batch.teacherId,
                    isSubstitute: instance.teacherId != null,
                    status: instance.status,
                    attendanceCount: instance.attendanceCount,
                    capacity: instance.capacity ?? instance.batch.capacity ?? null,
                    meetingLink: instance.meetingLink ?? '',
                    batchMeetingLink: instance.batch.meetingLink ?? '',
                    date: instance.date.toISOString(),
                    openAccess: instance.openAccess ?? instance.batch.openAccess,
                });
            }
        });

        // Also get all active recurring batches for reference (a one-time
        // batch already got its single instance at creation and shouldn't be
        // offered here as a target for a second one).
        const batches = await prisma.classBatch.findMany({
            where: {
                active: true,
                oneTime: false,
            },
            include: {
                teacher: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // Teachers available to assign as a substitute.
        const teachers = await prisma.user.findMany({
            where: { role: Role.TEACHER },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json({
            windowStart: startDate.toISOString().slice(0, 10),
            schedule: scheduleByDay,
            batches: batches.map(b => ({
                id: b.id,
                name: b.name,
                timeSlot: b.timeSlot,
                daysOfWeek: b.daysOfWeek,
                teacher: b.teacher.name,
            })),
            teachers,
        });
    } catch (error) {
        console.error('Admin schedule API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const admin = await requireDepartment(['TRAINER']);
    if (!admin) return forbidden();
    try {
        const { batchId, date } = await request.json().catch(() => ({}));
        if (!batchId || !date) {
            return NextResponse.json({ error: 'batchId and date are required' }, { status: 400 });
        }
        const batch = await prisma.classBatch.findUnique({ where: { id: batchId }, select: { teacherId: true, durationMin: true } });
        if (!batch) return NextResponse.json({ error: 'Unknown batch' }, { status: 404 });

        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) {
            return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        }

        const conflict = await assertNoInstanceConflict({ teacherId: batch.teacherId, date: parsedDate, durationMin: batch.durationMin });
        if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });

        const instance = await prisma.classInstance.create({
            data: { batchId, date: parsedDate, status: 'Scheduled' },
        });
        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'class.instance.create', entity: 'ClassInstance', entityId: instance.id,
            after: { batchId, date: instance.date },
        });
        return NextResponse.json({ instance: { id: instance.id } });
    } catch (error) {
        console.error('Admin schedule POST error:', error);
        return NextResponse.json({ error: 'Could not add class' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const admin = await requireDepartment(['TRAINER']);
    if (!admin) return forbidden();
    try {
        const { id, status, date, teacherId, openAccess, recordingUrl, meetingLink } = await request.json().catch(() => ({}));
        if (!id) return NextResponse.json({ error: 'Missing instance id' }, { status: 400 });
        if (status !== undefined && !INSTANCE_STATUSES.includes(status)) {
            return NextResponse.json({ error: `Status must be one of: ${INSTANCE_STATUSES.join(', ')}` }, { status: 400 });
        }
        const before = await prisma.classInstance.findUnique({
            where: { id },
            select: {
                status: true, meetingLink: true, attendanceCount: true, date: true, teacherId: true,
                batch: { select: { name: true, teacherId: true, durationMin: true } },
            },
        });
        if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        let newDate: Date | undefined;
        if (date !== undefined) {
            newDate = new Date(date);
            if (Number.isNaN(newDate.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        }

        let newTeacherId: string | null | undefined;
        if (teacherId !== undefined) {
            newTeacherId = teacherId || null;
            if (newTeacherId) {
                const t = await prisma.user.findUnique({ where: { id: newTeacherId }, select: { role: true } });
                if (!t || t.role !== Role.TEACHER) {
                    return NextResponse.json({ error: 'Substitute must be an existing teacher account.' }, { status: 400 });
                }
            }
        }

        // Reschedule and/or substitute-teacher changes both shift who's
        // committed to what, when — re-check for a clash exactly like
        // creating a fresh one-time instance already does.
        if (newDate !== undefined || newTeacherId !== undefined) {
            const effectiveTeacherId = newTeacherId !== undefined ? (newTeacherId ?? before.batch.teacherId) : (before.teacherId ?? before.batch.teacherId);
            const effectiveDate = newDate ?? before.date;
            const conflict = await assertNoInstanceConflict({
                teacherId: effectiveTeacherId, date: effectiveDate, durationMin: before.batch.durationMin, excludeInstanceId: id,
            });
            if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });
        }

        const data: Record<string, unknown> = {};
        if (status !== undefined) data.status = status;
        if (newDate !== undefined) data.date = newDate;
        if (newTeacherId !== undefined) data.teacherId = newTeacherId;
        if (openAccess !== undefined) data.openAccess = openAccess === null ? null : Boolean(openAccess);
        if (recordingUrl !== undefined) data.recordingUrl = recordingUrl || null;
        if (meetingLink !== undefined) data.meetingLink = meetingLink?.trim() || null;
        const instance = await prisma.classInstance.update({ where: { id }, data });
        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: status === 'Cancelled' ? 'class.instance.cancel'
                : newDate !== undefined ? 'class.instance.reschedule'
                : newTeacherId !== undefined ? 'class.instance.substitute'
                : 'class.instance.update',
            entity: 'ClassInstance', entityId: id,
            before: { status: before.status, meetingLink: before.meetingLink, date: before.date, teacherId: before.teacherId },
            after: { status: instance.status, meetingLink: instance.meetingLink, date: instance.date, teacherId: instance.teacherId },
        });

        // Cancelling a class — tell whoever would have joined, by email and
        // push, regardless of how far out the class is (previously this only
        // fired inside a 24h window, so an advance cancellation notified no
        // one at all).
        if (status === 'Cancelled' && before.status !== 'Cancelled') {
            const when = before.date.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
            const members = await eligibleEverydayMembers();
            const soon = before.date.getTime() - Date.now() < 24 * 3_600_000;
            for (const m of members) {
                sendEmail({
                    to: m.email,
                    subject: soon ? "Today's yoga class is cancelled" : `${before.batch.name} on ${when} is cancelled`,
                    html: emailLayout(
                        `<p>Hi ${m.name.split(' ')[0] || 'there'},</p>
                         <p>${soon ? 'Unfortunately ' : ''}<strong>${before.batch.name}</strong> on ${when} IST has been cancelled.${soon ? " We're sorry for the short notice — see you at the next class." : ''}</p>`,
                    ),
                }).catch(() => { });
            }
            sendPush(
                members.map((m) => m.id),
                { title: 'Class cancelled', body: `${before.batch.name} on ${when} IST has been cancelled.`, channelId: 'classes' },
            ).catch(() => { });
        }
        return NextResponse.json({ instance: { id: instance.id, status: instance.status, date: instance.date } });
    } catch (error) {
        console.error('Admin schedule PATCH error:', error);
        return NextResponse.json({ error: 'Could not update class' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const admin = await requireDepartment(['TRAINER']);
    if (!admin) return forbidden();
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing instance id' }, { status: 400 });

        const inst = await prisma.classInstance.findUnique({
            where: { id },
            select: { status: true, date: true, _count: { select: { attendees: true } } },
        });
        if (!inst) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (inst._count.attendees > 0 && url.searchParams.get('force') !== '1') {
            return NextResponse.json(
                { error: `This class has ${inst._count.attendees} attendance record(s). Cancel it instead, or pass force=1.` },
                { status: 409 },
            );
        }

        await prisma.classInstance.delete({ where: { id } });
        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'class.instance.delete', entity: 'ClassInstance', entityId: id,
            before: { status: inst.status, date: inst.date, attendees: inst._count.attendees },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin schedule DELETE error:', error);
        return NextResponse.json({ error: 'Could not delete class' }, { status: 500 });
    }
}

function formatTimeSlot(date: Date, durationMin = 60): string {
    const fmt = (d: Date) =>
        new Intl.DateTimeFormat('en-IN', {
            hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
        }).format(d);
    const end = new Date(date.getTime() + durationMin * 60_000);
    return `${fmt(date)} - ${fmt(end)} IST`;
}
