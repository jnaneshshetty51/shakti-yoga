import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { recordEvent } from '@/lib/analytics';
import { posthogCapture } from '@/lib/posthog';

const REWARD_MONTHS = 1;
const CREDIT_DAYS = 30;

function slug(name: string): string {
    return (name || 'yogi').toLowerCase().replace(/[^a-z]/g, '').slice(0, 8) || 'yogi';
}
function suffix(): string {
    return Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 4).toUpperCase();
}

/** The user's shareable code — generated and stored on first use. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true, name: true } });
    if (u?.referralCode) return u.referralCode;

    const base = slug(u?.name ?? '');
    for (let i = 0; i < 6; i++) {
        const code = `${base}${suffix()}`;
        try {
            await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
            return code;
        } catch {
            // unique clash — try another suffix
        }
    }
    // last resort: id-derived
    const code = `sy${userId.slice(-6).toUpperCase()}`;
    await prisma.user.update({ where: { id: userId }, data: { referralCode: code } }).catch(() => {});
    return code;
}

/**
 * Redeem a code for a newly-created user. Grants the referee CREDIT_DAYS of bonus
 * access (applied on their first plan activation). Idempotent, self-referral safe.
 */
export async function redeemReferral(refereeId: string, rawCode: string | null | undefined): Promise<boolean> {
    const code = String(rawCode ?? '').trim().toUpperCase();
    if (!code || code.length < 4 || code.length > 24) return false;

    const referrer = await prisma.user.findFirst({
        where: { referralCode: { equals: code, mode: 'insensitive' } },
        select: { id: true },
    });
    if (!referrer || referrer.id === refereeId) return false;

    try {
        await prisma.$transaction([
            prisma.referral.create({
                data: { referrerId: referrer.id, refereeId, code, rewardMonths: REWARD_MONTHS },
            }),
            prisma.user.update({
                where: { id: refereeId },
                data: { referralCreditDays: { increment: CREDIT_DAYS } },
            }),
        ]);
        void recordEvent('referral_converted', {
            userId: referrer.id,
            metadata: { stage: 'signed_up', refereeId },
        });
        return true;
    } catch {
        return false; // unique refereeId clash → already redeemed
    }
}

/**
 * Call on a user's first paid subscription. If they were referred, mark the
 * referral converted and reward the referrer — extend a live subscription, or
 * bank credit days for their next activation.
 */
export async function markReferralConverted(refereeId: string): Promise<void> {
    const ref = await prisma.referral.findUnique({ where: { refereeId } });
    if (!ref || ref.status === 'converted') return;

    const days = ref.rewardMonths * CREDIT_DAYS;
    const sub = await prisma.subscription.findUnique({
        where: { userId: ref.referrerId },
        select: { id: true, status: true, renewalDate: true },
    });

    const ops: Prisma.PrismaPromise<unknown>[] = [
        prisma.referral.update({
            where: { id: ref.id },
            data: { status: 'converted', convertedAt: new Date(), rewardedAt: new Date() },
        }),
    ];
    if (sub && (sub.status === 'ACTIVE' || sub.status === 'TRIAL')) {
        const extended = new Date(Math.max(sub.renewalDate.getTime(), Date.now()) + days * 86_400_000);
        ops.push(prisma.subscription.update({ where: { id: sub.id }, data: { renewalDate: extended } }));
    } else {
        ops.push(prisma.user.update({
            where: { id: ref.referrerId },
            data: { referralCreditDays: { increment: days } },
        }));
    }
    await prisma.$transaction(ops);

    void recordEvent('referral_converted', {
        userId: ref.referrerId,
        metadata: { stage: 'paid', refereeId, rewardDays: days },
    });
    posthogCapture(ref.referrerId, 'referral_converted', { referee_id: refereeId, reward_days: days });
}

export async function referralStats(userId: string) {
    const [code, rows, me] = await Promise.all([
        getOrCreateReferralCode(userId),
        prisma.referral.findMany({ where: { referrerId: userId }, select: { status: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { referralCreditDays: true } }),
    ]);
    return {
        code,
        invited: rows.length,
        converted: rows.filter((r) => r.status === 'converted').length,
        creditDays: me?.referralCreditDays ?? 0,
        rewardMonths: REWARD_MONTHS,
    };
}
