import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    verifyPassword,
    signToken,
    mapDatabaseRole,
    sessionClaims,
    setSessionCookie,
    SESSION_MAX_AGE,
    SESSION_MAX_AGE_REMEMBER,
} from '@/lib/auth';
import { syncSubscriptionState } from '@/lib/subscription';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { adminTier } from '@/lib/permissions';

// A real bcrypt hash (cost 10) of a random string — used to spend the same time
// hashing when the email doesn't match an account, so login can't be used to
// enumerate registered emails by timing.
const DUMMY_HASH = '$2b$10$0S48M5ziT7bDXCqOziuTZ.Ep36snEw6Fhzj37duUF1DMLmiD0nYWy';

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
        const remember = body?.remember === true;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // Always run a bcrypt comparison so the response time doesn't reveal
        // whether the email maps to a real account. DUMMY_HASH is a valid bcrypt
        // hash of a random string that nothing can match.
        const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
        const isValid = await verifyPassword(password, hashToCheck);

        if (!user || !user.passwordHash || !isValid) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });

        const effectiveRole = await syncSubscriptionState(user.id, user.role);
        const mappedRole = mapDatabaseRole(effectiveRole);

        const maxAge = remember ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE;
        const token = await signToken(
            sessionClaims({ ...user, role: effectiveRole }),
            maxAge,
        );
        await setSessionCookie(token, maxAge);

        const { passwordHash: _passwordHash, tokenVersion: _tv, adminDepartment, ...safeUser } = user;

        return NextResponse.json({
            user: { ...safeUser, role: mappedRole, tier: adminTier(effectiveRole), department: adminDepartment },
            message: 'Logged in successfully',
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
