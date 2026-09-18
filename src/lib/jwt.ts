// Edge-safe session token helpers — pure `jose`, no Node built-ins, no
// `next/headers`, no bcrypt. Safe to import from middleware.
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface SessionPayload extends JWTPayload {
    id: string;
    email: string;
    role: string;
    name: string;
    /** User.tokenVersion at sign time — a mismatch means the session was revoked. */
    tv?: number;
    /** Admin tier for role === 'admin': 'super' | 'staff'. Absent for everyone else. */
    tier?: 'super' | 'staff';
    /** Scoped admin department. Absent = full admin access. */
    dept?: 'CONTENT' | 'SUPPORT' | 'TRAINER' | 'THERAPIST';
}

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
const key = new TextEncoder().encode(process.env.JWT_SECRET);

export const SESSION_MAX_AGE = 60 * 60 * 24; // 1 day
export const SESSION_MAX_AGE_REMEMBER = 60 * 60 * 24 * 30; // 30 days

/**
 * `jti` ties this token to a `Session` row (see lib/auth.ts's issueSession(),
 * the only call site that should normally provide one) so a single device
 * can be logged out without touching every other session — unlike
 * `tv`/tokenVersion, which is all-or-nothing. Omitting it keeps working (a
 * token with no `jti` is treated by getSession() as predating per-session
 * tracking, checked against tokenVersion alone) — useful for tests/scripts
 * that just need a valid signed session and don't care about revocability.
 */
export async function signToken(
    payload: SessionPayload,
    maxAgeSeconds: number = SESSION_MAX_AGE,
    jti?: string,
): Promise<string> {
    const builder = new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds);
    if (jti) builder.setJti(jti);
    return await builder.sign(key);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, key);
        if (
            typeof payload.id === 'string' &&
            typeof payload.email === 'string' &&
            typeof payload.role === 'string' &&
            typeof payload.name === 'string'
        ) {
            return payload as SessionPayload;
        }
        return null;
    } catch {
        return null;
    }
}
