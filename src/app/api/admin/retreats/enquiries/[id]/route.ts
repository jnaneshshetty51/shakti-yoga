import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { RetreatEnquiryStatus } from '@prisma/client';

/** GET — one enquiry with its retreat context. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await context.params;
    const enquiry = await prisma.retreatEnquiry.findUnique({
        where: { id },
        include: { retreat: true },
    });
    if (!enquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ enquiry });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await context.params;

    const body = await request.json().catch(() => ({}));
    const status = String(body.status || '').toUpperCase();
    if (!(status in RetreatEnquiryStatus)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    const before = await prisma.retreatEnquiry.findUnique({ where: { id }, select: { status: true } });
    const enquiry = await prisma.retreatEnquiry.update({
        where: { id },
        data: { status: status as RetreatEnquiryStatus },
    });
    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: 'retreat.enquiry.status', entity: 'RetreatEnquiry', entityId: id,
        before: { status: before?.status }, after: { status },
    });
    return NextResponse.json({ enquiry });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await context.params;
    await prisma.retreatEnquiry.delete({ where: { id } });
    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: 'retreat.enquiry.delete', entity: 'RetreatEnquiry', entityId: id,
    });
    return NextResponse.json({ ok: true });
}
