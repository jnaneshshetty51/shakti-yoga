import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { eligibleEverydayMembers } from '@/lib/class-access';
import { sendEmail, emailLayout } from '@/lib/email';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get upcoming class instances for the next 7 days
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        const instances = await prisma.classInstance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                batch: {
                    include: {
                        teacher: {
                            select: {
                                name: true,
                            },
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
            status: string;
            attendanceCount: number;
            meetingLink: string; // per-instance override, '' when it falls back to the batch link
            batchMeetingLink: string;
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
            const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(instance.date);
            const dayKey = dayName as keyof typeof scheduleByDay;

            if (scheduleByDay[dayKey]) {
                scheduleByDay[dayKey].push({
                    id: instance.id,
                    batchName: instance.batch.name,
                    timeSlot: formatTimeSlot(instance.date),
                    teacher: instance.batch.teacher.name,
                    status: instance.status,
                    attendanceCount: instance.attendanceCount,
                    meetingLink: instance.meetingLink ?? '',
                    batchMeetingLink: instance.batch.meetingLink ?? '',
                });
            }
        });

        // Also get all active batches for reference
        const batches = await prisma.classBatch.findMany({
            where: {
                active: true,
            },
            include: {
                teacher: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json({
            schedule: scheduleByDay,
            batches: batches.map(b => ({
                id: b.id,
                name: b.name,
                timeSlot: b.timeSlot,
                daysOfWeek: b.daysOfWeek,
                teacher: b.teacher.name,
            })),
        });
    } catch (error) {
        console.error('Admin schedule API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    try {
        const { batchId, date } = await request.json().catch(() => ({}));
        if (!batchId || !date) {
            return NextResponse.json({ error: 'batchId and date are required' }, { status: 400 });
        }
        const instance = await prisma.classInstance.create({
            data: { batchId, date: new Date(date), status: 'Scheduled' },
        });
        return NextResponse.json({ instance: { id: instance.id } });
    } catch (error) {
        console.error('Admin schedule POST error:', error);
        return NextResponse.json({ error: 'Could not add class' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    try {
        const { id, status, attendanceCount, recordingUrl, meetingLink } = await request.json().catch(() => ({}));
        if (!id) return NextResponse.json({ error: 'Missing instance id' }, { status: 400 });
        const before = await prisma.classInstance.findUnique({
            where: { id },
            select: { status: true, meetingLink: true, attendanceCount: true, date: true, batch: { select: { name: true } } },
        });
        const data: Record<string, unknown> = {};
        if (status !== undefined) data.status = status;
        if (attendanceCount !== undefined) data.attendanceCount = Math.max(0, Math.trunc(Number(attendanceCount) || 0));
        if (recordingUrl !== undefined) data.recordingUrl = recordingUrl || null;
        if (meetingLink !== undefined) data.meetingLink = meetingLink?.trim() || null;
        const instance = await prisma.classInstance.update({ where: { id }, data });
        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: status === 'Cancelled' ? 'class.instance.cancel' : 'class.instance.update',
            entity: 'ClassInstance', entityId: id,
            before: before ? { status: before.status, meetingLink: before.meetingLink, attendanceCount: before.attendanceCount } : undefined,
            after: { status: instance.status, meetingLink: instance.meetingLink, attendanceCount: instance.attendanceCount },
        });

        // Cancelling a class within the next 24h — tell the members who'd have joined.
        if (status === 'Cancelled' && before && before.status !== 'Cancelled' &&
            before.date.getTime() - Date.now() < 24 * 3_600_000 && before.date.getTime() > Date.now() - 3_600_000) {
            const when = before.date.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
            const members = await eligibleEverydayMembers();
            for (const m of members) {
                sendEmail({
                    to: m.email,
                    subject: 'Today\'s yoga class is cancelled',
                    html: emailLayout(
                        `<p>Hi ${m.name.split(' ')[0] || 'there'},</p>
                         <p>Unfortunately <strong>${before.batch.name}</strong> on ${when} IST has been cancelled. We're sorry for the short notice — see you at the next class.</p>`,
                    ),
                }).catch(() => { });
            }
        }
        return NextResponse.json({ instance: { id: instance.id, status: instance.status } });
    } catch (error) {
        console.error('Admin schedule PATCH error:', error);
        return NextResponse.json({ error: 'Could not update class' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    try {
        const id = new URL(request.url).searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing instance id' }, { status: 400 });
        await prisma.classInstance.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin schedule DELETE error:', error);
        return NextResponse.json({ error: 'Could not delete class' }, { status: 500 });
    }
}

function formatTimeSlot(date: Date): string {
    const time = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(date);

    const endDate = new Date(date);
    endDate.setHours(endDate.getHours() + 1);
    const endTime = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(endDate);

    return `${time} - ${endTime} IST`;
}

