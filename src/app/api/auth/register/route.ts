import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, mapDatabaseRole, sessionClaims, setSessionCookie } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { readJson, str, optStr, email as parseEmail, handleValidationError } from '@/lib/validation';
import { recordEvent } from '@/lib/analytics';
import { sendEmail, emailLayout } from '@/lib/email';
import { SITE_URL } from '@/lib/site';

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

        const token = await signToken(sessionClaims(user));

        await setSessionCookie(token);
        recordEvent('SIGNUP', { userId: user.id, metadata: { country: country ?? null } });
        sendEmail({
            to: user.email,
            subject: 'Welcome to Shakti Yoga',
            html: emailLayout(
                `<p>Namaste ${firstName},</p>
                 <p>Your account is ready. Start with a <a href="${SITE_URL}/trial" style="color:#4A6741;font-weight:bold">7-day free trial</a> — full access to every live Everyday Yoga class, no card required.</p>
                 <p>Questions any time: just reply to this email.</p>`,
            ),
        }).catch(() => { });

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
