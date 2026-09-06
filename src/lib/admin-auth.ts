import { readSessionToken, verifyToken, type SessionPayload } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function session(): Promise<SessionPayload | null> {
    const token = await readSessionToken();
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload) return null;

    // Enforce session revocation (password reset / "log out everywhere") for
    // privileged routes — middleware can't do this DB check on the edge, and
    // these endpoints are the ones worth the extra query. A token that predates
    // the `tv` claim (undefined) is allowed through, same as elsewhere.
    if (typeof payload.tv === 'number') {
        const user = await prisma.user.findUnique({
            where: { id: payload.id },
            select: { tokenVersion: true },
        });
        if (!user || user.tokenVersion !== payload.tv) return null;
    }

    return payload;
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

/**
 * Teacher endpoints. Admins pass too (so they can preview a teacher's view),
 * but every query in a teacher route must still scope to `session.id` — never a
 * teacherId from the request.
 */
export async function requireTeacher(): Promise<SessionPayload | null> {
    return requireStaff();
}
