import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await requireDepartment('SUPPORT'))) return forbidden();
    const { id } = await params;

    const conversation = await prisma.supportConversation.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, name: true, email: true } },
            assignedTo: { select: { id: true, name: true } },
            messages: { orderBy: { createdAt: 'asc' } },
        },
    });
    if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ conversation });
}

/** PATCH /api/admin/support/[id] — close the conversation. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const admin = await requireDepartment('SUPPORT');
    if (!admin) return forbidden();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    if (body.status !== 'CLOSED') {
        return NextResponse.json({ error: 'Only closing a conversation is supported here.' }, { status: 400 });
    }

    const before = await prisma.supportConversation.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const conversation = await prisma.supportConversation.update({
        where: { id },
        data: { status: 'CLOSED' },
    });

    await recordAudit({
        actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
        action: 'support.conversation.close', entity: 'SupportConversation', entityId: id,
        before: { status: before.status }, after: { status: conversation.status },
    });

    return NextResponse.json({ conversation });
}
