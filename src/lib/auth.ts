import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import {
    signToken,
    verifyToken,
    type SessionPayload,
    SESSION_MAX_AGE,
    SESSION_MAX_AGE_REMEMBER,
} from '@/lib/jwt';
import { adminTier } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
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
    adminDepartment?: string | null;
}): SessionPayload {
    const tier = adminTier(user.role);
    const dept = tier === 'staff' && user.adminDepartment
        ? (user.adminDepartment as SessionPayload['dept'])
        : undefined;
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: mapDatabaseRole(user.role),
        tv: user.tokenVersion ?? 0,
        ...(tier ? { tier } : {}),
        ...(dept ? { dept } : {}),
    };
}

export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}

/**
 * The session token for the current request, from either transport:
 *   - `Authorization: Bearer <jwt>`  (native mobile app)
 *   - the `token` cookie             (web app)
 * Bearer wins when both are present.
 */
export async function readSessionToken(): Promise<string | null> {
    const authHeader = (await headers()).get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const bearer = authHeader.slice(7).trim();
        if (bearer) return bearer;
    }
    const cookieStore = await cookies();
    return cookieStore.get('token')?.value ?? null;
}

/**
 * The one place that decides whether a still-cryptographically-valid JWT's
 * claimed session is actually still live. Shared by getSession() and
 * /api/auth/me (which can't just delegate wholesale to getSession() — it
 * needs the raw payload/user for its own claims-refresh logic — so it
 * duplicates the *call*, not the *rule*).
 *
 * Two independent revocation levers, both must pass:
 *   - tokenVersion: all-or-nothing (password reset, admin deactivation, "log
 *     out everywhere") — a token predating the `tv` claim skips this.
 *   - Session.revokedAt/expiresAt: single-device logout — a token predating
 *     the `jti` claim (issued before this model existed) skips this and is
 *     judged on tokenVersion alone until it naturally expires.
 */
export async function isSessionValid(
    payload: SessionPayload,
    user: { tokenVersion: number; active: boolean },
): Promise<boolean> {
    if (!user.active) return false;
    if (typeof payload.tv === 'number' && payload.tv !== user.tokenVersion) return false;

    if (typeof payload.jti === 'string') {
        const session = await prisma.session.findUnique({
            where: { id: payload.jti },
            select: { revokedAt: true, expiresAt: true },
        });
        if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) return false;
        // Best-effort — never let a logging failure fail the auth check.
        void prisma.session.update({ where: { id: payload.jti }, data: { lastSeenAt: new Date() } }).catch(() => {});
    }

    return true;
}

export async function getSession(): Promise<SessionPayload | null> {
    const token = await readSessionToken();
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload) return null;

    // A token with neither claim predates both revocation mechanisms —
    // nothing to check, so skip the DB round-trip entirely.
    if (typeof payload.tv !== 'number' && typeof payload.jti !== 'string') {
        return payload;
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { tokenVersion: true, active: true },
    });
    if (!user || !(await isSessionValid(payload, user))) return null;

    return payload;
}

/**
 * Create a tracked `Session` row and mint its JWT together — the one path
 * every login/register/refresh flow should use instead of calling
 * signToken() directly, so every real session is revocable on its own
 * (see isSessionValid()). Pass `replacesJti` when reissuing a token for an
 * *already-established* session (claims refresh, near-expiry rollover) so
 * the old row is retired rather than left orphaned.
 */
export async function issueSession(
    user: Parameters<typeof sessionClaims>[0],
    opts: { maxAgeSeconds?: number; userAgent?: string | null; platform?: string | null; replacesJti?: string | null } = {},
): Promise<string> {
    const maxAgeSeconds = opts.maxAgeSeconds ?? SESSION_MAX_AGE;
    const session = await prisma.session.create({
        data: {
            userId: user.id,
            expiresAt: new Date(Date.now() + maxAgeSeconds * 1000),
            userAgent: opts.userAgent ?? null,
            platform: opts.platform ?? null,
        },
    });
    if (opts.replacesJti) {
        await prisma.session.update({ where: { id: opts.replacesJti }, data: { revokedAt: new Date() } }).catch(() => {});
    }
    return signToken(sessionClaims(user), maxAgeSeconds, session.id);
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
        case 'MEMBER_STARTER':
            return 'member_starter';
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
