import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/site';
import { markReferralConverted } from '@/lib/referral';

/**
 * GET /api/auth/verify-email?token=... — the link clicked from the welcome
 * email. Signup never blocked on this; verifying only unlocks referral-reward
 * payout for whoever referred this signup (see markReferralConverted).
 */
export async function GET(request: Request) {
    const token = new URL(request.url).searchParams.get('token') ?? '';
    const tokenHash = token ? createHash('sha256').update(token).digest('hex') : '';

    const row = tokenHash
        ? await prisma.emailVerificationToken.findUnique({ where: { tokenHash } })
        : null;

    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
        return NextResponse.redirect(`${SITE_URL}/login?verify=invalid`);
    }

    await prisma.$transaction([
        prisma.emailVerificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
        prisma.user.update({ where: { id: row.userId }, data: { emailVerified: true } }),
    ]);

    // markReferralConverted() gates on emailVerified, but it's normally called
    // right at checkout — which usually happens before the user has clicked
    // this link. Re-check now so a referral doesn't stay stuck PENDING forever
    // just because payment came in first.
    const sub = await prisma.subscription.findUnique({ where: { userId: row.userId }, select: { planType: true } });
    if (sub) void markReferralConverted(row.userId, sub.planType).catch(() => {});

    return NextResponse.redirect(`${SITE_URL}/login?verify=done`);
}
