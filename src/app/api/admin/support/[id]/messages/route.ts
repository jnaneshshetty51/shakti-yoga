import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { sendPush } from '@/lib/push';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** POST /api/admin/support/[id]/messages — staff reply. No manual assignment step:
 * whoever replies first becomes the soft "assigned to" for the queue view. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const admin = await requireDepartment('SUPPORT');
    if (!admin) return forbidden();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    const conversation = await prisma.supportConversation.findUnique({ where: { id } });
    if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (conversation.status === 'CLOSED') {
        return NextResponse.json({ error: 'This conversation is closed.' }, { status: 409 });
    }

    const [, updated] = await prisma.$transaction([
        prisma.supportMessage.create({
            data: { conversationId: id, senderId: admin.id, senderRole: 'staff', body: message },
        }),
        prisma.supportConversation.update({
            where: { id },
            data: {
                lastMessageAt: new Date(),
                assignedToId: conversation.assignedToId ?? admin.id,
            },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        }),
    ]);

    sendPush(conversation.userId, {
        title: 'Reply from Shakti support',
        body: message.slice(0, 120),
        url: '/dashboard/support',
    }).catch(() => {});

    return NextResponse.json({ conversation: updated });
}
