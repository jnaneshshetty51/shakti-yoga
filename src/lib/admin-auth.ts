import { readSessionToken, verifyToken, type SessionPayload } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

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

/** Any admin session (super or staff), regardless of department scoping. Internal — routes should call requireAdmin() or requireDepartment() instead. */
async function adminSession(): Promise<SessionPayload | null> {
    const payload = await session();
    if (!payload || payload.role !== 'admin') return null;
    return payload;
}

/**
 * Returns the session payload for a *full* admin (super, or a staff admin with
 * no department scope) — otherwise null. A departmented staff admin (Content
 * Team / Support Staff) is deliberately rejected here: routes that are that
 * department's territory must call requireDepartment() instead, and routes
 * outside every department's territory (users, corporate, retreats, ...)
 * correctly stay out of reach for a departmented account.
 *   const admin = await requireAdmin();
 *   if (!admin) return forbidden();
 */
export async function requireAdmin(): Promise<SessionPayload | null> {
    const payload = await adminSession();
    if (!payload || payload.dept) return null;
    return payload;
}

/**
 * Returns the session only for a SUPER_ADMIN. Falls back to a DB check when the
 * token predates the `tier` claim, so it's correct without forcing a re-login.
 */
export async function requireSuperAdmin(): Promise<SessionPayload | null> {
    const payload = await adminSession();
    if (!payload) return null;
    if (payload.tier === 'super') return payload;
    if (payload.tier === 'staff') return null;
    // Legacy token without a tier claim — confirm against the DB.
    const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { role: true } });
    return user?.role === 'SUPER_ADMIN' ? payload : null;
}

/**
 * Admin, scoped to one department. A SUPER_ADMIN or a STAFF_ADMIN with no
 * `adminDepartment` set (full access) always passes; a departmented staff
 * account only passes for its own department.
 */
export type AdminDept = 'CONTENT' | 'SUPPORT' | 'TRAINER' | 'THERAPIST';

export async function requireDepartment(dept: AdminDept | AdminDept[]): Promise<SessionPayload | null> {
    const payload = await adminSession();
    if (!payload) return null;
    if (payload.tier === 'super') return payload;
    if (!payload.dept) return payload; // full-access staff admin
    const allowed = Array.isArray(dept) ? dept : [dept];
    return allowed.includes(payload.dept as AdminDept) ? payload : null;
}

const ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.STAFF_ADMIN];

/**
 * Shared guard for "can `admin` delete this user" — used by both
 * /api/admin/users and /api/admin/staff so the two routes can't drift apart
 * on who's allowed to remove an admin or a teacher with live obligations.
 * Returns an error message (safe to show the caller) if deletion should be
 * refused, or null if it's OK to proceed.
 */
export async function assertUserDeletable(
    admin: SessionPayload,
    target: { id: string; role: Role },
): Promise<string | null> {
    if (target.id === admin.id) return 'You cannot delete your own account.';

    if (ADMIN_ROLES.includes(target.role) && !(await requireSuperAdmin())) {
        return 'Only a super admin can remove an admin.';
    }
    if (target.role === Role.SUPER_ADMIN) {
        const supers = await prisma.user.count({ where: { role: Role.SUPER_ADMIN } });
        if (supers <= 1) return 'Cannot remove the only super admin.';
    }

    if (target.role === Role.TEACHER) {
        const classesTaught = await prisma.classBatch.count({ where: { teacherId: target.id } });
        if (classesTaught > 0) {
            return `This teacher is assigned to ${classesTaught} class batch(es). Reassign those first.`;
        }
        const upcoming = await prisma.booking.count({
            where: { teacherId: target.id, status: { in: ['PENDING', 'CONFIRMED'] }, date: { gt: new Date() } },
        });
        if (upcoming > 0) {
            return `This teacher has ${upcoming} upcoming session(s). Reassign or cancel them first.`;
        }
    }

    return null;
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
