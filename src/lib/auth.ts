import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import {
    signToken,
    verifyToken,
    type SessionPayload,
    SESSION_MAX_AGE,
    SESSION_MAX_AGE_REMEMBER,
} from '@/lib/jwt';
import { adminTier } from '@/lib/permissions';
import type { Role } from '@prisma/client';

export { signToken, verifyToken, SESSION_MAX_AGE, SESSION_MAX_AGE_REMEMBER };
export type { SessionPayload };

/** Build the JWT claims for a user row (DB role -> mapped role + tier + tokenVersion). */
export function sessionClaims(user: {
    id: string;
    email: string;
    name: string;
    role: Role | string;
    tokenVersion?: number | null;
}): SessionPayload {
    const tier = adminTier(user.role);
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: mapDatabaseRole(user.role),
        tv: user.tokenVersion ?? 0,
        ...(tier ? { tier } : {}),
    };
}

export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    return await verifyToken(token);
}

/** Issue the session cookie. Single source of truth for the cookie's options. */
export async function setSessionCookie(token: string, maxAgeSeconds: number = SESSION_MAX_AGE) {
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: maxAgeSeconds,
        path: '/',
    });
}

export async function clearSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.delete('token');
}

export function mapDatabaseRole(dbRole: string): string {
    switch (dbRole) {
        case 'SUPER_ADMIN':
        case 'STAFF_ADMIN':
            return 'admin';
        case 'TEACHER':
            return 'teacher';
        case 'MEMBER_EVERYDAY':
            return 'member_everyday';
        case 'MEMBER_THERAPY':
            return 'member_therapy';
        case 'TRIAL':
            return 'trial';
        case 'VISITOR':
            return 'visitor';
        default:
            return 'visitor';
    }
}
