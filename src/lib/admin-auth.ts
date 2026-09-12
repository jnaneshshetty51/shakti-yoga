import { getSession, type SessionPayload } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// getSession() already enforces tokenVersion-based revocation for every
// caller; admin/teacher routes just need the role/tier checks below.
const session = getSession;

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
