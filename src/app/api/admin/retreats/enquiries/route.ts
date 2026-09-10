import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { RetreatEnquiryStatus } from '@prisma/client';

export async function GET(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const status = new URL(request.url).searchParams.get('status');
    const enquiries = await prisma.retreatEnquiry.findMany({
        where: status && status !== 'all' ? { status: status.toUpperCase() as RetreatEnquiryStatus } : undefined,
        include: { retreat: { select: { id: true, name: true, kind: true } } },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ enquiries });
}
