import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { TherapyIntakeStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

/** GET /api/admin/therapy/intakes?status= — list assessments, newest submission first. */
export async function GET(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status && status !== 'all' ? { status: status.toUpperCase() as TherapyIntakeStatus } : {};

    const intakes = await prisma.therapyIntake.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, phone: true, country: true } } },
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ intakes });
}
