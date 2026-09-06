import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
    verifyToken,
    signToken,
    mapDatabaseRole,
    sessionClaims,
    setSessionCookie,
    clearSessionCookie,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncSubscriptionState } from '@/lib/subscription';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

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

        // Keep the cookie's claims in sync with reality so middleware and the
        // client agree (e.g. after a lazy subscription expiry or a name change).
        if (mappedRole !== payload.role || user.name !== payload.name || user.email !== payload.email) {
            // Preserve the remaining lifetime of the current session (don't shorten
            // a "remember me" session on an incidental refresh).
            const remaining = typeof payload.exp === 'number'
                ? Math.max(60, payload.exp - Math.floor(Date.now() / 1000))
                : undefined;
            const fresh = await signToken(sessionClaims({ ...user, role: effectiveRole }), remaining);
            await setSessionCookie(fresh, remaining);
        }

        return NextResponse.json({ user: { ...user, role: mappedRole } });
    } catch (error) {
        console.error('Me API error:', error);
        return NextResponse.json({ user: null });
    }
}
