import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { SITE_URL } from '@/lib/site';

const TOKEN_TTL_MS = 2 * 60 * 1000; // short-lived — only meant to bridge one app→browser tap

/**
 * POST /api/auth/web-handoff { path } — mobile-only. Mints a one-time token
 * the web middleware exchanges for a real session cookie, so opening the web
 * checkout from the app doesn't force a second login (the web session has no
 * way to recognize the app's bearer token otherwise). `path` must be a plain
 * relative path — never accepts a full URL, so this can't be used as an open
 * redirect.
 */
export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const rawPath = typeof body.path === 'string' ? body.path : '/dashboard/billing';
    const path = rawPath.startsWith('/') && !rawPath.startsWith('//') && !rawPath.includes(':')
        ? rawPath
        : '/dashboard/billing';

    const rawToken = randomBytes(32).toString('hex');
    await prisma.webHandoffToken.create({
        data: {
            userId: session.id,
            tokenHash: createHash('sha256').update(rawToken).digest('hex'),
            expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
    });

    return NextResponse.json({ url: `${SITE_URL}${path}?handoff=${rawToken}` });
}
