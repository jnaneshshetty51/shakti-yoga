import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/** Native app calls this on sign-out (and when the user turns push off). */
export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { token?: unknown };
    const token = typeof body.token === 'string' ? body.token.trim() : '';

    if (token) {
        // Only delete a token that belongs to this user.
        await prisma.pushToken.deleteMany({ where: { token, userId: session.id } });
    }

    return NextResponse.json({ ok: true });
}
