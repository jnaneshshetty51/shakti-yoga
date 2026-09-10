import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** GET /api/admin/support — the conversation queue, newest activity first. */
export async function GET(request: Request) {
    if (!(await requireDepartment('SUPPORT'))) return forbidden();

    const status = new URL(request.url).searchParams.get('status');

    const conversations = await prisma.supportConversation.findMany({
        where: status && status !== 'all' ? { status: status.toUpperCase() as 'OPEN' | 'CLOSED' } : undefined,
        include: {
            user: { select: { id: true, name: true, email: true } },
            assignedTo: { select: { id: true, name: true } },
            _count: { select: { messages: true } },
        },
        orderBy: { lastMessageAt: 'desc' },
    });

    return NextResponse.json({
        conversations: conversations.map((c) => ({
            id: c.id,
            userId: c.userId,
            userName: c.user.name,
            userEmail: c.user.email,
            subject: c.subject,
            status: c.status,
            assignedToName: c.assignedTo?.name ?? null,
            messageCount: c._count.messages,
            lastMessageAt: c.lastMessageAt,
            createdAt: c.createdAt,
        })),
    });
}
