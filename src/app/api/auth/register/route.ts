import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, mapDatabaseRole } from '@/lib/auth';
import { cookies } from 'next/headers';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

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

        const body = await request.json();
        const { email, password, firstName, lastName, country, timezone, phone } = body;

        if (!email || !password || !firstName || !lastName) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'A user with this email already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await hashPassword(password);
        const fullName = `${firstName} ${lastName}`.trim();

        // Create user in database
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                name: fullName,
                country: country || null,
                timezone: timezone || 'IST',
                phone: phone || null,
                role: 'VISITOR' // Default role for new signups
            }
        });

        // Map role
        const mappedRole = mapDatabaseRole(user.role);

        // Create JWT token for auto-login
        const token = await signToken({
            id: user.id,
            email: user.email,
            role: mappedRole,
            name: user.name,
        });

        // Set cookie
        const cookieStore = await cookies();
        cookieStore.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        // Return user data without passwordHash
        const { passwordHash: _, ...userWithoutPassword } = user;

        return NextResponse.json({
            user: { ...userWithoutPassword, role: mappedRole },
            message: 'Account created successfully',
        }, { status: 201 });
        
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
