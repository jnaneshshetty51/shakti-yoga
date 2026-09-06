import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail, emailLayout } from '@/lib/email';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Always the same response regardless of whether the email matched an
// account - don't let this endpoint be used to enumerate registered emails.
function genericResponse() {
    return NextResponse.json({
        message: 'If an account exists for that email, we\'ve sent a password reset link.',
    });
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const { allowed, retryAfterSeconds } = rateLimit(`forgot-password:${ip}`, 5, 60 * 60 * 1000);
        if (!allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
            );
        }

        const body = await request.json().catch(() => ({}));
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
            const rawToken = randomBytes(32).toString('hex');
            const tokenHash = createHash('sha256').update(rawToken).digest('hex');

            // A fresh request supersedes any earlier outstanding tokens for this user.
            await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
            await prisma.passwordResetToken.create({
                data: {
                    userId: user.id,
                    tokenHash,
                    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
                },
            });

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

            sendEmail({
                to: user.email,
                subject: 'Reset your Shakti Yoga password',
                html: emailLayout(
                    `<p>Hi ${user.name.split(' ')[0] || 'there'},</p>
                     <p>We received a request to reset your password. This link is valid for 1 hour:</p>
                     <p><a href="${resetUrl}" style="color:#4A6741;font-weight:bold">Reset your password</a></p>
                     <p>If you didn't request this, you can safely ignore this email.</p>`,
                ),
            }).catch(() => { });
        }

        return genericResponse();
    } catch (error) {
        console.error('Forgot password error:', error);
        // Still generic - don't leak whether the failure was enumeration-relevant.
        return genericResponse();
    }
}
