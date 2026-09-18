import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    getSession,
    issueSession,
    setSessionCookie,
    SESSION_MAX_AGE_REMEMBER,
} from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Revokes every session (web browsers, phones, tablets) for the caller except
 * this current one. Bumps `User.tokenVersion` (belt-and-suspenders — kills
 * even a legacy token that predates per-session tracking) AND explicitly
 * revokes every `Session` row, then mints a fresh tracked session for the
 * current device so the user stays signed in.
 */
export async function POST(request: Request) {
    try {
        const payload = await getSession();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { allowed, retryAfterSeconds } = await rateLimit(`logout-all:${payload.id}`, 5, 15 * 60 * 1000);
        if (!allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again in a few minutes.' },
                { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
            );
        }

        // Atomically bump tokenVersion — invalidates every existing JWT for this user.
        const user = await prisma.user.update({
            where: { id: payload.id },
            data: { tokenVersion: { increment: 1 } },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                tokenVersion: true,
                adminDepartment: true,
            },
        });

        // Explicitly revoke every tracked session too, so a "your devices" view
        // (or this same jti check) reflects reality rather than relying solely
        // on the tokenVersion mismatch to reject them.
        await prisma.session.updateMany({
            where: { userId: user.id, revokedAt: null },
            data: { revokedAt: new Date() },
        });

        // Issue a fresh, freshly-tracked session for the current client.
        const freshToken = await issueSession(user, {
            maxAgeSeconds: SESSION_MAX_AGE_REMEMBER,
            userAgent: request.headers.get('user-agent'),
        });

        // Update the HTTP-only cookie if this request originated from a browser.
        await setSessionCookie(freshToken, SESSION_MAX_AGE_REMEMBER);

        return NextResponse.json({
            ok: true,
            message: 'All other sessions have been logged out successfully.',
            token: freshToken,
        });
    } catch (error) {
        console.error('[logout-all] error:', error);
        return NextResponse.json({ error: 'Could not log out of other sessions. Please try again.' }, { status: 500 });
    }
}
