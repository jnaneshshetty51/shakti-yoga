import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/support — the caller's most recent conversation (open or closed) with its messages. */
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const conversation = await prisma.supportConversation.findFirst({
        where: { userId: session.id },
        orderBy: { updatedAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    return NextResponse.json({ conversation }, { headers: { 'Cache-Control': 'no-store' } });
}

/** POST /api/support — start a new conversation. Refused while one is still open. */
export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const subject = typeof body?.subject === 'string' ? body.subject.trim().slice(0, 200) : null;
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    const open = await prisma.supportConversation.findFirst({ where: { userId: session.id, status: 'OPEN' } });
    if (open) return NextResponse.json({ error: 'You already have an open conversation.' }, { status: 409 });

    const conversation = await prisma.supportConversation.create({
        data: {
            userId: session.id,
            subject,
            messages: { create: { senderId: session.id, senderRole: 'member', body: message } },
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    return NextResponse.json({ conversation });
}
