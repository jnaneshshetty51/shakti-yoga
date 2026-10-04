import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await ctx.params;

    const batches = await prisma.classBatch.findMany({
        where: { active: true, oneTime: false },
        include: {
            teacher: { select: { id: true, name: true } },
            instances: {
                take: 1,
                orderBy: { date: 'desc' },
                select: {
                    attendanceCount: true,
                },
            },
        },
        orderBy: { timeSlot: 'asc' },
    });

    const formatted = batches.map((b) => ({
        id: b.id,
        name: b.name,
        planType: b.planType,
        daysOfWeek: b.daysOfWeek,
        timeSlot: b.timeSlot,
        durationMin: b.durationMin,
        capacity: b.capacity ?? 25,
        teacher: b.teacher.name,
        recentHeadcount: b.instances[0]?.attendanceCount ?? 0,
    }));

    return NextResponse.json({ batches: formatted });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    if (!body || !body.batchId) {
        return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    const member = await prisma.user.findUnique({
        where: { id },
        select: { id: true, subscription: { select: { id: true } } },
    });
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const targetBatch = await prisma.classBatch.findUnique({
        where: { id: body.batchId },
        include: { teacher: { select: { name: true } } },
    });
    if (!targetBatch) {
        return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Find previous batch from latest switch audit
    const previous = await prisma.auditLog.findFirst({
        where: { entityId: id, action: 'student.batch.switch' },
        orderBy: { createdAt: 'desc' },
    });

    const [entry] = await prisma.$transaction([
        prisma.auditLog.create({
            data: {
                actorId: admin.id,
                actorEmail: admin.email,
                action: 'student.batch.switch',
                entity: 'User',
                entityId: id,
                ...(previous?.after ? { before: previous.after as any } : {}),
                after: {
                    batchId: targetBatch.id,
                    batchName: targetBatch.name,
                    timeSlot: targetBatch.timeSlot,
                    teacherName: targetBatch.teacher.name,
                    reason: body.reason || 'Admin reassignment',
                },
            },
        }),
        // The audit log is a history trail; this is the real, queryable assignment that
        // the member drill-down and roster/capacity reporting should actually rely on.
        ...(member.subscription
            ? [
                  prisma.subscription.update({
                      where: { id: member.subscription.id },
                      data: { currentBatchId: targetBatch.id },
                  }),
              ]
            : []),
    ]);

    return NextResponse.json({
        success: true,
        assignedBatch: {
            batchId: targetBatch.id,
            batchName: targetBatch.name,
            timeSlot: targetBatch.timeSlot,
        },
        auditId: entry.id,
    });
}
