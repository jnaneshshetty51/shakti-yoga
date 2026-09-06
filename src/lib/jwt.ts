// Edge-safe session token helpers — pure `jose`, no Node built-ins, no
// `next/headers`, no bcrypt. Safe to import from middleware.
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface SessionPayload extends JWTPayload {
    id: string;
    email: string;
    role: string;
    name: string;
}

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
const key = new TextEncoder().encode(process.env.JWT_SECRET);

export const SESSION_MAX_AGE = 60 * 60 * 24; // 1 day
export const SESSION_MAX_AGE_REMEMBER = 60 * 60 * 24 * 30; // 30 days

export async function signToken(
    payload: SessionPayload,
    maxAgeSeconds: number = SESSION_MAX_AGE,
): Promise<string> {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
        .sign(key);
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
