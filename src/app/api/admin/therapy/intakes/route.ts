import { NextResponse } from 'next/server';
import { requireDepartment } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { TherapyIntakeStatus, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/** GET /api/admin/therapy/intakes?status=&q=&page=&pageSize= — list assessments, newest submission first. */
export async function GET(request: Request) {
    const admin = await requireDepartment(['THERAPIST']);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const q = searchParams.get('q')?.trim();
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE));

    const where: Prisma.TherapyIntakeWhereInput = {
        ...(status && status !== 'all' ? { status: status.toUpperCase() as TherapyIntakeStatus } : {}),
        ...(q ? { OR: [
            { primaryConcern: { contains: q, mode: 'insensitive' } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
        ] } : {}),
    };

    const [intakes, totalCount] = await Promise.all([
        prisma.therapyIntake.findMany({
            where,
            include: { user: { select: { id: true, name: true, email: true, phone: true, country: true } } },
            orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.therapyIntake.count({ where }),
    ]);

    return NextResponse.json({ intakes, page, pageSize, totalCount });
}
