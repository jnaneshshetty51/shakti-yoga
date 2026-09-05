import { cookies } from 'next/headers';
import { verifyToken, type SessionPayload } from '@/lib/auth';

/**
 * Returns the session payload if the caller is an admin, otherwise null.
 * Usage:
 *   const admin = await requireAdmin();
 *   if (!admin) return forbidden();
 */
export async function requireAdmin(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') return null;

    return payload;
}
