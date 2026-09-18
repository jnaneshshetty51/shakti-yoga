import { NextResponse } from 'next/server';
import { clearSessionCookie, readSessionToken, verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Logs out THIS session only (unlike /api/auth/logout-all). Works for both
 * transports — readSessionToken() checks the Authorization: Bearer header
 * (mobile) before the cookie (web) — so the mobile app can call this too,
 * not just clear its local token and leave the session usable server-side.
 */
export async function POST() {
    const token = await readSessionToken();
    if (token) {
        const payload = await verifyToken(token);
        if (payload?.jti) {
            await prisma.session.update({ where: { id: payload.jti }, data: { revokedAt: new Date() } }).catch(() => {});
        }
    }
    await clearSessionCookie();
    return NextResponse.json({ message: 'Logged out successfully' });
}
