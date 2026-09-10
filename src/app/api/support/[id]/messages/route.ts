import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sendPush } from '@/lib/push';

/** POST /api/support/[id]/messages — reply on your own OPEN conversation. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    const conversation = await prisma.supportConversation.findUnique({ where: { id } });
    if (!conversation || conversation.userId !== session.id) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    if (conversation.status === 'CLOSED') {
        return NextResponse.json({ error: 'This conversation is closed. Start a new one.' }, { status: 409 });
    }

    const [, updated] = await prisma.$transaction([
        prisma.supportMessage.create({
            data: { conversationId: id, senderId: session.id, senderRole: 'member', body: message },
        }),
        prisma.supportConversation.update({
            where: { id },
            data: { lastMessageAt: new Date() },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        }),
    ]);

    if (conversation.assignedToId) {
        sendPush(conversation.assignedToId, {
            title: 'New support reply',
            body: message.slice(0, 120),
            url: '/admin/support',
        }).catch(() => {});
    }

    return NextResponse.json({ conversation: updated });
}
