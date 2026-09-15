import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    getSession,
    signToken,
    sessionClaims,
    setSessionCookie,
    SESSION_MAX_AGE_REMEMBER,
} from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Revokes every session (web browsers, phones, tablets) for the caller except
 * this current one. Bumps `User.tokenVersion` so every other outstanding JWT is
 * immediately rejected by `getSession()`, and mints a fresh token with the new
 * `tokenVersion` for the current device so the user stays signed in.
 */
export async function POST() {
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

        // Issue a fresh session for the current client with the updated tokenVersion.
        const freshToken = await signToken(
            sessionClaims(user),
            SESSION_MAX_AGE_REMEMBER,
        );

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
