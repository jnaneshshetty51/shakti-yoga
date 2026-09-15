import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { applyAttendance } from '@/lib/sessionCredits';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function dayBounds(dateStr: string | null) {
    const base = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date();
    if (Number.isNaN(+base)) return dayBounds(null);
    const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
    const end = new Date(start.getTime() + 24 * 3_600_000);
    return { start, end };
}

/**
 * GET ?mode=today&date=YYYY-MM-DD — that day's class instances with a
 * present/pending breakdown (a "pending" attendee tapped Join but a teacher
 * hasn't confirmed Present/Absent yet).
 * GET ?mode=history&page=&pageSize=&q=&status= — flat, searchable ledger of
 * every ClassAttendance row (student, teacher, class, date, status).
 */
export async function GET(request: Request) {
    if (!(await requireDepartment(['TRAINER']))) return forbidden();
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') === 'history' ? 'history' : 'today';

    if (mode === 'today') {
        const { start, end } = dayBounds(url.searchParams.get('date'));
        const instances = await prisma.classInstance.findMany({
            where: { date: { gte: start, lt: end }, status: { not: 'Cancelled' } },
            include: {
                batch: { select: { name: true, teacher: { select: { name: true } } } },
                attendees: { select: { status: true } },
            },
            orderBy: { date: 'asc' },
        });
        return NextResponse.json({
            date: start.toISOString().slice(0, 10),
            instances: instances.map((i) => ({
                id: i.id,
                batchName: i.batch.name,
                teacher: i.batch.teacher.name,
                date: i.date.toISOString(),
                status: i.status,
                presentCount: i.attendees.filter((a) => a.status === 'PRESENT').length,
                absentCount: i.attendees.filter((a) => a.status === 'ABSENT').length,
                pendingCount: i.attendees.filter((a) => a.status === 'CHECKED_IN').length,
            })),
        });
    }

    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE));
    const q = url.searchParams.get('q')?.trim();
    const statusFilter = url.searchParams.get('status');

    const where: Prisma.ClassAttendanceWhereInput = {
        ...(statusFilter && statusFilter in { CHECKED_IN: 1, PRESENT: 1, ABSENT: 1 } ? { status: statusFilter as never } : {}),
        ...(q
            ? {
                  OR: [
                      { user: { name: { contains: q, mode: 'insensitive' } } },
                      { user: { email: { contains: q, mode: 'insensitive' } } },
                      { classInstance: { batch: { name: { contains: q, mode: 'insensitive' } } } },
                      { classInstance: { batch: { teacher: { name: { contains: q, mode: 'insensitive' } } } } },
                  ],
              }
            : {}),
    };

    const [rows, totalCount] = await Promise.all([
        prisma.classAttendance.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true } },
                classInstance: { select: { date: true, batch: { select: { name: true, teacher: { select: { name: true } } } } } },
                confirmedBy: { select: { name: true } },
            },
            orderBy: { joinedAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.classAttendance.count({ where }),
    ]);

    return NextResponse.json({
        rows: rows.map((r) => ({
            id: r.id,
            classInstanceId: r.classInstanceId,
            studentName: r.user.name,
            studentEmail: r.user.email,
            batchName: r.classInstance.batch.name,
            teacher: r.classInstance.batch.teacher.name,
            date: r.classInstance.date.toISOString(),
            status: r.status,
            addedByTeacher: r.addedByTeacher,
            confirmedBy: r.confirmedBy?.name ?? null,
        })),
        page,
        pageSize,
        totalCount,
    });
}

/** PATCH { id, classInstanceId, status } — correct one attendance row (present <-> absent), via the same credit-safe path as live confirmation. */
export async function PATCH(request: Request) {
    const admin = await requireDepartment(['TRAINER']);
    if (!admin) return forbidden();
    const body = await request.json().catch(() => ({}));
    const { id, classInstanceId, status } = body as { id?: string; classInstanceId?: string; status?: string };
    if (!id || !classInstanceId || (status !== 'PRESENT' && status !== 'ABSENT')) {
        return NextResponse.json({ error: 'Missing id, classInstanceId, or a valid status' }, { status: 400 });
    }

    const row = await prisma.classAttendance.findUnique({ where: { id }, select: { userId: true, status: true } });
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await applyAttendance(classInstanceId, [{ userId: row.userId, status }], admin.id);
    const present = await prisma.classAttendance.count({ where: { classInstanceId, status: 'PRESENT' } });
    await prisma.classInstance.update({ where: { id: classInstanceId }, data: { attendanceCount: present } });

    await auditAs(admin, request)({
        action: 'attendance.correct',
        entity: 'ClassAttendance',
        entityId: id,
        before: { status: row.status },
        after: { status },
    });

    return NextResponse.json({ ok: true });
}
