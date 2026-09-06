import { cookies } from 'next/headers';
import { verifyToken, type SessionPayload } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function session(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    return verifyToken(token);
}

/**
 * Returns the session payload if the caller is any admin (super or staff),
 * otherwise null.
 *   const admin = await requireAdmin();
 *   if (!admin) return forbidden();
 */
export async function requireAdmin(): Promise<SessionPayload | null> {
    const payload = await session();
    if (!payload || payload.role !== 'admin') return null;
    return payload;
}

/**
 * Returns the session only for a SUPER_ADMIN. Falls back to a DB check when the
 * token predates the `tier` claim, so it's correct without forcing a re-login.
 */
export async function requireSuperAdmin(): Promise<SessionPayload | null> {
    const payload = await requireAdmin();
    if (!payload) return null;
    if (payload.tier === 'super') return payload;
    if (payload.tier === 'staff') return null;
    // Legacy token without a tier claim — confirm against the DB.
    const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { role: true } });
    return user?.role === 'SUPER_ADMIN' ? payload : null;
}

/** Admin or teacher — for endpoints teachers also operate (class join, session Meet links). */
export async function requireStaff(): Promise<SessionPayload | null> {
    const payload = await session();
    if (!payload || (payload.role !== 'admin' && payload.role !== 'teacher')) return null;
    return payload;
}
