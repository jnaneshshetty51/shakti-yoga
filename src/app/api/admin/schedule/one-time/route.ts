import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { assertNoInstanceConflict, istParts } from '@/lib/class-schedule';
import { Role } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/**
 * Create a genuine one-off class in a single step: a throwaway `oneTime`
 * ClassBatch (so it never shows up in the recurring-batch list and
 * ensureInstances never generates a second occurrence from it) plus its one
 * ClassInstance, together. Previously the only way to get a single class not
 * tied to an ongoing recurring schedule was to hand-create a full recurring
 * batch shape just to attach one instance to it.
 */
export async function POST(request: Request) {
    const admin = await requireDepartment(['TRAINER']);
    if (!admin) return forbidden();

    try {
        const body = await request.json().catch(() => ({}));
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const teacherId = typeof body.teacherId === 'string' ? body.teacherId : '';
        const durationMin = Number.isFinite(Number(body.durationMin)) && Number(body.durationMin) > 0 ? Math.trunc(Number(body.durationMin)) : 60;
        const capacity = body.capacity && Number(body.capacity) > 0 ? Math.trunc(Number(body.capacity)) : null;
        const meetingLink = typeof body.meetingLink === 'string' && body.meetingLink.trim() ? body.meetingLink.trim() : null;
        const openAccess = body.openAccess === true;

        if (!name || !teacherId || !body.date) {
            return NextResponse.json({ error: 'Name, teacher and date/time are required' }, { status: 400 });
        }
        const date = new Date(body.date);
        if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });

        const teacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { role: true } });
        if (!teacher || teacher.role !== Role.TEACHER) {
            return NextResponse.json({ error: 'Unknown teacher' }, { status: 400 });
        }

        const conflict = await assertNoInstanceConflict({ teacherId, date, durationMin });
        if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });

        const { weekday } = istParts(date);
        const istHourMinute = new Date(date.getTime() + (5 * 60 + 30) * 60_000);
        const hour24 = istHourMinute.getUTCHours();
        const minute = istHourMinute.getUTCMinutes();
        const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
        const timeSlot = `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${hour24 < 12 ? 'AM' : 'PM'}`;

        const result = await prisma.$transaction(async (tx) => {
            const batch = await tx.classBatch.create({
                data: {
                    name, teacherId, durationMin, capacity, meetingLink,
                    planType: 'EVERYDAY_YOGA',
                    daysOfWeek: [weekday],
                    timeSlot,
                    oneTime: true,
                    openAccess,
                    active: true,
                },
            });
            const instance = await tx.classInstance.create({
                data: { batchId: batch.id, date, status: 'Scheduled', capacity, meetingLink },
            });
            return { batch, instance };
        });

        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'class.instance.create_one_time', entity: 'ClassInstance', entityId: result.instance.id,
            after: { name, teacherId, date, durationMin, capacity, openAccess },
        });

        return NextResponse.json({ batch: { id: result.batch.id }, instance: { id: result.instance.id } });
    } catch (error) {
        console.error('Admin one-time class POST error:', error);
        return NextResponse.json({ error: 'Could not create the class' }, { status: 500 });
    }
}
