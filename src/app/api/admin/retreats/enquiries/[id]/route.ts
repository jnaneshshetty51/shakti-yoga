import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { RetreatEnquiryStatus } from '@prisma/client';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await context.params;

    const body = await request.json().catch(() => ({}));
    const status = String(body.status || '').toUpperCase();
    if (!(status in RetreatEnquiryStatus)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    const enquiry = await prisma.retreatEnquiry.update({
        where: { id },
        data: { status: status as RetreatEnquiryStatus },
    });
    return NextResponse.json({ enquiry });
}
