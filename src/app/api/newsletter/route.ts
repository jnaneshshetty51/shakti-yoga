import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readJson, email as emailField, ValidationError, handleValidationError } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
    try {
        const { allowed, retryAfterSeconds } = await rateLimit(`newsletter:${getClientIp(request)}`, 5, 60 * 60 * 1000);
        if (!allowed) {
            return NextResponse.json(
                { error: 'Too many attempts. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
            );
        }

        const body = await readJson(request);
        const email = emailField(body.email);

        await prisma.newsletterSubscriber.upsert({
            where: { email },
            create: { email },
            update: {},
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof ValidationError) return handleValidationError(error);
        console.error('Newsletter API error:', error);
        return NextResponse.json({ error: 'Could not sign you up. Please try again.' }, { status: 500 });
    }
}
