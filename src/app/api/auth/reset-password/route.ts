import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const { allowed, retryAfterSeconds } = rateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000);
        if (!allowed) {
            return NextResponse.json(
                { error: 'Too many attempts. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
            );
        }

        const body = await request.json().catch(() => ({}));
        const token = typeof body.token === 'string' ? body.token : '';
        const password = typeof body.password === 'string' ? body.password : '';

        if (!token || !password) {
            return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        const tokenHash = createHash('sha256').update(token).digest('hex');
        const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

        if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
            return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });
        }

        const passwordHash = await hashPassword(password);
        await prisma.$transaction([
            prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
            prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
        ]);

        return NextResponse.json({ message: 'Password updated. You can now log in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Could not reset password. Please try again.' }, { status: 500 });
    }
}
