import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * Native app registers its Expo push token here after sign-in / on foreground.
 * Idempotent: upsert by token, and if the token was previously attached to a
 * different account (shared device), move it to the current user.
 */
export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as {
        token?: unknown;
        platform?: unknown;
        deviceName?: unknown;
    };

    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const platform = body.platform === 'ios' || body.platform === 'android' ? body.platform : null;
    const deviceName =
        typeof body.deviceName === 'string' && body.deviceName.length <= 120 ? body.deviceName : null;

    if (!token || token.length > 256 || !platform) {
        return NextResponse.json({ error: 'token and platform are required' }, { status: 400 });
    }

    await prisma.pushToken.upsert({
        where: { token },
        create: { token, platform, deviceName, userId: session.id },
        update: { userId: session.id, platform, deviceName, lastSeenAt: new Date() },
    });

    return NextResponse.json({ ok: true });
}
