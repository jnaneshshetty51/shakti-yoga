import { NextResponse } from 'next/server';
import {
    readSessionToken,
    verifyToken,
    signToken,
    mapDatabaseRole,
    sessionClaims,
    setSessionCookie,
    clearSessionCookie,
    SESSION_MAX_AGE_REMEMBER,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncSubscriptionState } from '@/lib/subscription';
import { adminTier } from '@/lib/permissions';

export async function GET() {
    try {
        const token = await readSessionToken();

        if (!token) {
            return NextResponse.json({ user: null });
        }

        const payload = await verifyToken(token);

        if (!payload) {
            await clearSessionCookie();
            return NextResponse.json({ user: null });
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                country: true,
                timezone: true,
                avatarUrl: true,
                credits: true,
                tokenVersion: true,
                adminDepartment: true,
            },
        });

        if (!user) {
            // Token references a user that no longer exists — drop the stale cookie
            // so the browser stops sending it (otherwise middleware keeps letting
            // them past to pages that then bounce them here).
            await clearSessionCookie();
            return NextResponse.json({ user: null });
        }

        // Session revoked (password reset / log-out-everywhere) — reject and clear.
        if (typeof payload.tv === 'number' && payload.tv !== user.tokenVersion) {
            await clearSessionCookie();
            return NextResponse.json({ user: null });
        }

        const effectiveRole = await syncSubscriptionState(user.id, user.role);
        const mappedRole = mapDatabaseRole(effectiveRole);
        const { tokenVersion: _tv, adminDepartment, ...safeUser } = user;

        // Keep the session claims in sync with reality so middleware and the
        // client agree (e.g. after a lazy subscription expiry or a name change).
        // Also proactively re-mint when the token is close to expiry, so an
        // actively-used native session never hard-logs-out at the 30-day mark.
        const secondsLeft = typeof payload.exp === 'number'
            ? payload.exp - Math.floor(Date.now() / 1000)
            : null;
        const claimsDrifted =
            mappedRole !== payload.role || user.name !== payload.name || user.email !== payload.email
            || (payload.dept ?? null) !== (adminDepartment ?? null);
        const nearExpiry = secondsLeft !== null && secondsLeft < 7 * 24 * 60 * 60;

        let freshToken: string | undefined;
        if (claimsDrifted || nearExpiry) {
            // On near-expiry, roll the session forward a full window. On a plain
            // drift, preserve whatever lifetime is left.
            const ttl = nearExpiry || secondsLeft === null
                ? SESSION_MAX_AGE_REMEMBER
                : Math.max(60, secondsLeft);
            freshToken = await signToken(sessionClaims({ ...user, role: effectiveRole }), ttl);
            await setSessionCookie(freshToken, ttl);
        }

        return NextResponse.json({
            user: { ...safeUser, role: mappedRole, tier: adminTier(effectiveRole), department: adminDepartment },
            // The native app has no cookie jar — when we re-mint the session it
            // must pick up the new token from the body and persist it.
            ...(freshToken ? { token: freshToken } : {}),
        });
    } catch (error) {
        console.error('Me API error:', error);
        return NextResponse.json({ user: null });
    }
}
