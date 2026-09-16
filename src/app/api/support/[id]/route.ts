import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * PATCH /api/support/[id] — update conversation status (e.g. mark CLOSED / resolved).
 * Allowed for the conversation owner (member) or staff/admin.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await ctx.params;

    const conversation = await prisma.supportConversation.findUnique({ where: { id } });
    if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const isStaff = session.role === 'admin' || session.role === 'teacher';
    if (!isStaff && conversation.userId !== session.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const status = body?.status === 'OPEN' ? 'OPEN' : 'CLOSED';

    const updated = await prisma.supportConversation.update({
        where: { id },
        data: { status, updatedAt: new Date() },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    return NextResponse.json({ conversation: updated });
}
