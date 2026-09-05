import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { PlanType } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
    if (!(await requireAdmin())) return forbidden();
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
            days: batch.daysOfWeek,
            daysOfWeek: batch.daysOfWeek.join(','),
            planType: batch.planType,
            teacher: batch.teacher.name,
            teacherId: batch.teacherId,
            meetingLink: batch.meetingLink ?? '',
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
    daysOfWeek?: string;
    planType?: string;
    teacherId?: string;
    meetingLink?: string;
    active?: boolean | string;
}

function toData(body: BatchInput) {
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.timeSlot !== undefined) data.timeSlot = String(body.timeSlot).trim();
    if (body.daysOfWeek !== undefined) {
        data.daysOfWeek = String(body.daysOfWeek)
            .split(',')
            .map(d => d.trim())
            .filter(Boolean);
    }
    if (body.planType !== undefined) {
        if (!(body.planType in PlanType)) throw new Error('Invalid plan type');
        data.planType = body.planType;
    }
    if (body.teacherId !== undefined) data.teacherId = body.teacherId;
    if (body.meetingLink !== undefined) data.meetingLink = body.meetingLink || null;
    if (body.active !== undefined) data.active = body.active === true || body.active === 'true';
    return data;
}

export async function POST(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    try {
        const body = await request.json().catch(() => ({}));
        if (!body.name || !body.timeSlot || !body.planType || !body.teacherId) {
            return NextResponse.json({ error: 'Name, time, plan and teacher are required' }, { status: 400 });
        }
        if (!(body.planType in PlanType)) {
            return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
        }
        const batch = await prisma.classBatch.create({
            data: {
                name: String(body.name).trim(),
                timeSlot: String(body.timeSlot).trim(),
                planType: body.planType,
                teacherId: body.teacherId,
                meetingLink: body.meetingLink || null,
                daysOfWeek: String(body.daysOfWeek ?? '')
                    .split(',')
                    .map((d: string) => d.trim())
                    .filter(Boolean),
                active: body.active === undefined ? true : body.active === true || body.active === 'true',
            },
        });
        return NextResponse.json({ batch: { id: batch.id } });
    } catch (error) {
        console.error('Admin classes POST error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create class' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    try {
        const body = await request.json().catch(() => ({}));
        if (!body.id) return NextResponse.json({ error: 'Missing class id' }, { status: 400 });
        const batch = await prisma.classBatch.update({ where: { id: body.id }, data: toData(body) });
        return NextResponse.json({ batch: { id: batch.id } });
    } catch (error) {
        console.error('Admin classes PATCH error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update class' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    try {
        const id = new URL(request.url).searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing class id' }, { status: 400 });
        await prisma.$transaction([
            prisma.classInstance.deleteMany({ where: { batchId: id } }),
            prisma.classBatch.delete({ where: { id } }),
        ]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin classes DELETE error:', error);
        return NextResponse.json({ error: 'Could not delete class' }, { status: 500 });
    }
}
