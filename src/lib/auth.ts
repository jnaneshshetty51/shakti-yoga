import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface SessionPayload extends JWTPayload {
    id: string;
    email: string;
    role: string;
    name: string;
}
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
const key = new TextEncoder().encode(process.env.JWT_SECRET);

export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}

export async function signToken(payload: SessionPayload): Promise<string> {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(key);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, key);
        return payload as SessionPayload;
    } catch (_error) {
        return null;
    }
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    return await verifyToken(token);
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
