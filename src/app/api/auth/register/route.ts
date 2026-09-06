import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, mapDatabaseRole } from '@/lib/auth';
import { cookies } from 'next/headers';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { readJson, str, optStr, email as parseEmail, handleValidationError } from '@/lib/validation';

const TIMEZONES = ['IST', 'PST', 'EST', 'CST', 'MST', 'GMT', 'CET', 'AEDT', 'AEST', 'NZDT'] as const;

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const { allowed, retryAfterSeconds } = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
        if (!allowed) {
            return NextResponse.json(
                { error: 'Too many signup attempts. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
            );
        }

        const body = await readJson(request);
        const email = parseEmail(body.email, 'Email');
        const password = str(body.password, { label: 'Password', min: 8, max: 200, trim: false });
        const firstName = str(body.firstName, { label: 'First name', min: 1, max: 100 });
        const lastName = str(body.lastName, { label: 'Last name', min: 1, max: 100 });
        const country = optStr(body.country, { label: 'Country', max: 100 });
        const phoneRaw = optStr(body.phone, { label: 'Phone', max: 40 });
        const tzRaw = optStr(body.timezone, { label: 'Timezone', max: 60 });
        // tolerate labels like "IST (GMT+5:30)" from the signup form's <select>
        const tzKey = tzRaw?.trim().split(/[\s(]/)[0].toUpperCase();
        const timezone = (TIMEZONES as readonly string[]).includes(tzKey ?? '') ? tzKey! : 'IST';

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json(
                { error: 'An account with this email already exists' },
                { status: 409 }
            );
        }

        const passwordHash = await hashPassword(password);
        const fullName = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                name: fullName,
                country: country ?? null,
                timezone,
                phone: phoneRaw ?? null,
                role: 'VISITOR', // Default role for new signups
            },
        });

        const mappedRole = mapDatabaseRole(user.role);

        const token = await signToken({
            id: user.id,
            email: user.email,
            role: mappedRole,
            name: user.name,
        });

        const cookieStore = await cookies();
        cookieStore.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        const { passwordHash: _, ...userWithoutPassword } = user;

        return NextResponse.json({
            user: { ...userWithoutPassword, role: mappedRole },
            message: 'Account created successfully',
        }, { status: 201 });
    } catch (error) {
        try {
            return handleValidationError(error);
        } catch {
            console.error('Registration error:', error);
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            );
        }
    }
}
