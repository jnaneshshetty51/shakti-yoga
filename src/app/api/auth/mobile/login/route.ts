import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    verifyPassword,
    signToken,
    mapDatabaseRole,
    sessionClaims,
    SESSION_MAX_AGE_REMEMBER,
} from '@/lib/auth';
import { syncSubscriptionState } from '@/lib/subscription';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { adminTier } from '@/lib/permissions';

// Same dummy hash the web login uses — keeps response time constant whether or
// not the email maps to an account (no timing-based email enumeration).
const DUMMY_HASH = '$2b$10$0S48M5ziT7bDXCqOziuTZ.Ep36snEw6Fhzj37duUF1DMLmiD0nYWy';

/**
 * Native-app login. Same credential check as POST /api/auth/login, but the
 * session JWT comes back in the response body (the app stores it in the device
 * keychain and sends it as `Authorization: Bearer`) — no cookie is set.
 * Tokens are long-lived (30 days); the app re-authenticates when one expires.
 */
export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const { allowed, retryAfterSeconds } = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
        if (!allowed) {
            return NextResponse.json(
                { error: 'Too many login attempts. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
            );
        }

        const body = await request.json().catch(() => null);
        const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body?.password === 'string' ? body.password : '';

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        const isValid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

        if (!user || !user.passwordHash || !isValid) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

        const effectiveRole = await syncSubscriptionState(user.id, user.role);
        const mappedRole = mapDatabaseRole(effectiveRole);
        const token = await signToken(
            sessionClaims({ ...user, role: effectiveRole }),
            SESSION_MAX_AGE_REMEMBER,
        );

        const { passwordHash: _p, tokenVersion: _tv, ...safeUser } = user;

        return NextResponse.json({
            token,
            expiresInSeconds: SESSION_MAX_AGE_REMEMBER,
            user: { ...safeUser, role: mappedRole, tier: adminTier(effectiveRole) },
        });
    } catch (error) {
        console.error('Mobile login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
