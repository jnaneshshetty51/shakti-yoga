import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { toMinutes, rangesOverlap } from '@/lib/timeOverlap';
import { PlanType } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
    if (!(await requireDepartment(['TRAINER']))) return forbidden();
    try {
        const [batches, teachers] = await Promise.all([
            prisma.classBatch.findMany({
                include: { teacher: { select: { id: true, name: true } } },
                orderBy: { timeSlot: 'asc' },
            }),
            prisma.user.findMany({
                where: { role: 'TEACHER' },
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
        ]);

        const formattedBatches = batches.map(batch => ({
            id: batch.id,
            name: batch.name,
            time: `${batch.timeSlot} IST`,
            timeSlot: batch.timeSlot,
            durationMin: batch.durationMin,
            days: batch.daysOfWeek,
            daysOfWeek: batch.daysOfWeek.join(','),
            planType: batch.planType,
            teacher: batch.teacher.name,
            teacherId: batch.teacherId,
            meetingLink: batch.meetingLink ?? '',
            capacity: batch.capacity ?? '',
            active: batch.active,
        }));

        return NextResponse.json({ batches: formattedBatches, teachers });
    } catch (error) {
        console.error('Admin classes API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

interface BatchInput {
    name?: string;
    timeSlot?: string;
    durationMin?: number | string;
    daysOfWeek?: string;
    planType?: string;
    teacherId?: string;
    meetingLink?: string;
    capacity?: number | string;
    active?: boolean | string;
}

// Group classes are Everyday Yoga only — Yoga Therapy is strictly 1:1 (Booking).
function assertGroupPlan(planType: string) {
    if (planType === 'YOGA_THERAPY') {
        throw new Error('Group classes are Everyday Yoga only. Therapy sessions are booked 1:1.');
    }
    if (!(planType in PlanType)) throw new Error('Invalid plan type');
}

function parseDuration(v: number | string): number {
    const n = Math.trunc(Number(v));
    if (!Number.isFinite(n) || n < 15 || n > 240) throw new Error('Duration must be 15–240 minutes');
    return n;
}

/**
 * Refuses a batch that would double-book a teacher: another active batch for
 * the same teacher, sharing at least one weekday, whose time window overlaps.
 * Returns a human-readable conflict message, or null if it's clear.
 */
async function assertNoTeacherConflict(params: {
    teacherId: string;
    timeSlot: string;
    durationMin: number;
    daysOfWeek: string[];
    excludeId?: string;
}): Promise<string | null> {
    const { teacherId, timeSlot, durationMin, daysOfWeek, excludeId } = params;
    if (!daysOfWeek.length) return null;
    const start = toMinutes(timeSlot);
    const end = start + durationMin;

    const others = await prisma.classBatch.findMany({
        where: { teacherId, active: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
        select: { name: true, timeSlot: true, durationMin: true, daysOfWeek: true },
    });
    for (const other of others) {
        if (!other.daysOfWeek.some((d) => daysOfWeek.includes(d))) continue;
        const otherStart = toMinutes(other.timeSlot);
        const otherEnd = otherStart + other.durationMin;
        if (rangesOverlap(start, end, otherStart, otherEnd)) {
            return `This teacher already has "${other.name}" at ${other.timeSlot} (${other.durationMin}min) on an overlapping day.`;
        }
    }
    return null;
}

function toData(body: BatchInput) {
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.timeSlot !== undefined) data.timeSlot = String(body.timeSlot).trim();
    if (body.durationMin !== undefined) data.durationMin = parseDuration(body.durationMin);
    if (body.daysOfWeek !== undefined) {
        data.daysOfWeek = String(body.daysOfWeek)
            .split(',')
            .map(d => d.trim())
            .filter(Boolean);
    }
    if (body.planType !== undefined) {
        assertGroupPlan(body.planType);
        data.planType = body.planType;
    }
    if (body.teacherId !== undefined) data.teacherId = body.teacherId;
    if (body.meetingLink !== undefined) data.meetingLink = body.meetingLink || null;
    if (body.capacity !== undefined) {
        const c = Math.trunc(Number(body.capacity));
        data.capacity = Number.isFinite(c) && c > 0 ? c : null;
    }
    if (body.active !== undefined) data.active = body.active === true || body.active === 'true';
    return data;
}

export async function POST(request: Request) {
    const admin = await requireDepartment(['TRAINER']);
    if (!admin) return forbidden();
    try {
        const body = await request.json().catch(() => ({}));
        if (!body.name || !body.timeSlot || !body.planType || !body.teacherId) {
            return NextResponse.json({ error: 'Name, time, plan and teacher are required' }, { status: 400 });
        }
        try {
            assertGroupPlan(body.planType);
        } catch (e) {
            return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid plan type' }, { status: 400 });
        }
        const timeSlot = String(body.timeSlot).trim();
        const durationMin = body.durationMin === undefined ? 60 : parseDuration(body.durationMin);
        const daysOfWeek = String(body.daysOfWeek ?? '').split(',').map((d: string) => d.trim()).filter(Boolean);
        const teacherId = String(body.teacherId);

        const conflict = await assertNoTeacherConflict({ teacherId, timeSlot, durationMin, daysOfWeek });
        if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });

        const batch = await prisma.classBatch.create({
            data: {
                name: String(body.name).trim(),
                timeSlot,
                durationMin,
                planType: body.planType,
                teacherId,
                meetingLink: body.meetingLink || null,
                capacity: body.capacity && Number(body.capacity) > 0 ? Math.trunc(Number(body.capacity)) : null,
                daysOfWeek,
                active: body.active === undefined ? true : body.active === true || body.active === 'true',
            },
        });
        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'class.batch.create', entity: 'ClassBatch', entityId: batch.id,
            after: { name: batch.name, timeSlot, durationMin, teacherId, daysOfWeek },
        });
        return NextResponse.json({ batch: { id: batch.id } });
    } catch (error) {
        console.error('Admin classes POST error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create class' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const admin = await requireDepartment(['TRAINER']);
    if (!admin) return forbidden();
    try {
        const body = await request.json().catch(() => ({}));
        if (!body.id) return NextResponse.json({ error: 'Missing class id' }, { status: 400 });
        const before = await prisma.classBatch.findUnique({
            where: { id: body.id },
            select: { name: true, meetingLink: true, timeSlot: true, durationMin: true, daysOfWeek: true, teacherId: true, active: true },
        });
        if (!before) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

        const patch = toData(body);
        const resultingActive = (patch.active as boolean) ?? before.active;
        if (resultingActive) {
            const conflict = await assertNoTeacherConflict({
                teacherId: (patch.teacherId as string) ?? before.teacherId,
                timeSlot: (patch.timeSlot as string) ?? before.timeSlot,
                durationMin: (patch.durationMin as number) ?? before.durationMin,
                daysOfWeek: (patch.daysOfWeek as string[]) ?? before.daysOfWeek,
                excludeId: body.id,
            });
            if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });
        }

        const batch = await prisma.classBatch.update({ where: { id: body.id }, data: patch });
        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'class.batch.update', entity: 'ClassBatch', entityId: body.id,
            before, after: { name: batch.name, meetingLink: batch.meetingLink, timeSlot: batch.timeSlot, teacherId: batch.teacherId, active: batch.active },
        });
        return NextResponse.json({ batch: { id: batch.id } });
    } catch (error) {
        console.error('Admin classes PATCH error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update class' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const admin = await requireDepartment(['TRAINER']);
    if (!admin) return forbidden();
    try {
        const id = new URL(request.url).searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing class id' }, { status: 400 });
        const before = await prisma.classBatch.findUnique({ where: { id }, select: { name: true, timeSlot: true } });
        await prisma.$transaction([
            prisma.classInstance.deleteMany({ where: { batchId: id } }),
            prisma.classBatch.delete({ where: { id } }),
        ]);
        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'class.batch.delete', entity: 'ClassBatch', entityId: id, before,
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin classes DELETE error:', error);
        return NextResponse.json({ error: 'Could not delete class' }, { status: 500 });
    }
}
