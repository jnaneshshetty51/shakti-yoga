import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { applyAttendance } from '@/lib/sessionCredits';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** GET — attendance rows for a class instance. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    if (!(await requireDepartment(['TRAINER']))) return forbidden();
    const { id } = await ctx.params;

    const instance = await prisma.classInstance.findUnique({
        where: { id },
        include: { batch: { select: { name: true } } },
    });
    if (!instance) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const rows = await prisma.classAttendance.findMany({
        where: { classInstanceId: id },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: 'asc' },
    });

    return NextResponse.json({
        instance: { id: instance.id, batchName: instance.batch.name, date: instance.date.toISOString(), status: instance.status },
        attendees: rows.map((r) => ({
            userId: r.userId,
            name: r.user.name,
            email: r.user.email,
            status: r.status,
            confirmed: !!r.confirmedAt,
            addedByTeacher: r.addedByTeacher,
        })),
    });
}

/** POST — confirm attendance.  { decisions: [{ userId, status: "PRESENT"|"ABSENT" }], addEmails: string[] } */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireDepartment(['TRAINER']);
    if (!admin) return forbidden();
    const { id } = await ctx.params;

    const body = await request.json().catch(() => ({}));
    const decisions: { userId: string; status: 'PRESENT' | 'ABSENT' }[] = Array.isArray(body.decisions)
        ? body.decisions
            .filter((d: unknown): d is { userId: string; status: string } => !!d && typeof (d as { userId?: unknown }).userId === 'string')
            .map((d: { userId: string; status: string }) => ({
                userId: d.userId,
                status: d.status === 'PRESENT' ? 'PRESENT' : 'ABSENT',
            }))
        : [];

    // Resolve any "add this member" emails to a PRESENT decision — one batched
    // lookup instead of a sequential query per email.
    const addEmails: string[] = Array.isArray(body.addEmails)
        ? body.addEmails.map((e: unknown) => String(e).trim().toLowerCase()).filter(Boolean)
        : [];
    if (addEmails.length > 0) {
        const users = await prisma.user.findMany({
            where: { email: { in: addEmails } },
            select: { id: true, email: true },
        });
        const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));
        for (const email of addEmails) {
            const userId = byEmail.get(email);
            if (userId && !decisions.some((d) => d.userId === userId)) decisions.push({ userId, status: 'PRESENT' });
        }
    }

    if (decisions.length === 0) return NextResponse.json({ error: 'Nothing to confirm.' }, { status: 400 });

    const { confirmed } = await applyAttendance(id, decisions, admin.id);
    // Keep the instance's summary count in step.
    const present = await prisma.classAttendance.count({ where: { classInstanceId: id, status: 'PRESENT' } });
    await prisma.classInstance.update({ where: { id }, data: { attendanceCount: present } });

    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: 'class.attendance.confirm', entity: 'ClassInstance', entityId: id,
        after: { confirmed, present },
    });

    return NextResponse.json({ ok: true, confirmed, present });
}
