import { prisma } from '@/lib/prisma';
import type { Prisma, PlanType } from '@prisma/client';
import { ReferralStatus, TherapyIntakeStatus } from '@prisma/client';
import { recordEvent } from '@/lib/analytics';
import { posthogCapture } from '@/lib/posthog';
import { recordAudit } from '@/lib/audit';
import { getReferralSettings } from '@/lib/settings';

/**
 * Referral rewards are ₹-denominated (the business set these numbers in rupees),
 * so both the wallet-credit and the one-time referee discount only apply to INR
 * checkouts for now. International (USD) payments and app-store IAP purchases
 * still let the *referrer* earn a reward (see markReferralConverted — that part
 * is currency-agnostic), they just can't have a discount deducted automatically.
 */
const DISCOUNTABLE_CURRENCY = 'INR';

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
 * Record attribution for a newly-created user. Grants nothing by itself — no
 * reward for the referrer, no discount for the referee — that only happens once
 * the referee completes a real qualifying payment (see markReferralConverted /
 * previewCheckoutDiscount). Self-referral safe; one referral per referee ever
 * (unique `refereeId`), so a deleted-and-recreated account can't be re-attributed
 * to a second referrer under a different email, and a referee can't rack up
 * multiple referrers.
 */
export async function redeemReferral(refereeId: string, rawCode: string | null | undefined): Promise<boolean> {
    const code = String(rawCode ?? '').trim().toUpperCase();
    if (!code || code.length < 4 || code.length > 24) return false;

    const referrer = await prisma.user.findFirst({
        where: { referralCode: { equals: code, mode: 'insensitive' } },
        select: { id: true },
    });
    if (!referrer || referrer.id === refereeId) return false;

    const { validityDays } = await getReferralSettings();
    const expiresAt = new Date(Date.now() + validityDays * 86_400_000);

    try {
        await prisma.referral.create({
            data: { referrerId: referrer.id, refereeId, code, expiresAt },
        });
        void recordEvent('referral_converted', { userId: referrer.id, metadata: { stage: 'signed_up', refereeId } });
        return true;
    } catch {
        return false; // unique refereeId clash → already attributed
    }
}

/** Flip a referral to EXPIRED if its window has lapsed. Returns the (possibly updated) status. */
async function expireIfNeeded(referral: { id: string; status: ReferralStatus; expiresAt: Date }): Promise<ReferralStatus> {
    if (referral.status !== ReferralStatus.PENDING || referral.expiresAt.getTime() > Date.now()) {
        return referral.status;
    }
    await prisma.referral.update({ where: { id: referral.id }, data: { status: ReferralStatus.EXPIRED } });
    return ReferralStatus.EXPIRED;
}

export interface CheckoutDiscount {
    /** ₹ taken from the payer's own accumulated referral-credit wallet. */
    creditApplied: number;
    /** ₹ one-time discount for a referred user's first qualifying payment. */
    refereeDiscountApplied: number;
}

/**
 * What discount (if any) applies to this checkout, capped at the gross amount.
 * Read-only — does not consume anything. Only meaningful for INR; everything
 * else returns zero (see module note on currency scope).
 */
export async function previewCheckoutDiscount(
    userId: string,
    currency: string,
    planInterval: string,
    grossAmount: number,
): Promise<CheckoutDiscount> {
    if (currency !== DISCOUNTABLE_CURRENCY || planInterval === 'trial' || grossAmount <= 0) {
        return { creditApplied: 0, refereeDiscountApplied: 0 };
    }

    const [user, referral] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { referralCreditBalance: true } }),
        prisma.referral.findUnique({ where: { refereeId: userId } }),
    ]);

    let remaining = grossAmount;
    let refereeDiscountApplied = 0;

    if (referral && referral.status === ReferralStatus.PENDING && referral.refereeDiscountAmount === 0) {
        const status = await expireIfNeeded(referral);
        if (status === ReferralStatus.PENDING) {
            const { refereeDiscount } = await getReferralSettings();
            refereeDiscountApplied = Math.min(refereeDiscount, remaining);
            remaining -= refereeDiscountApplied;
        }
    }

    const creditApplied = Math.min(user?.referralCreditBalance ?? 0, remaining);

    return { creditApplied, refereeDiscountApplied };
}

/** Consume whatever discount a just-paid Payment recorded — called once, at verification time. */
export async function consumeCheckoutDiscount(userId: string, payment: { creditApplied: number; refereeDiscountApplied: number }): Promise<void> {
    const ops: Prisma.PrismaPromise<unknown>[] = [];
    if (payment.creditApplied > 0) {
        ops.push(prisma.user.update({
            where: { id: userId },
            data: { referralCreditBalance: { decrement: payment.creditApplied } },
        }));
    }
    if (payment.refereeDiscountApplied > 0) {
        ops.push(prisma.referral.updateMany({
            where: { refereeId: userId, refereeDiscountAmount: 0 },
            data: { refereeDiscountAmount: payment.refereeDiscountApplied },
        }));
    }
    if (ops.length) await prisma.$transaction(ops);
}

/**
 * Call on a user's first qualifying paid subscription (never for a trial). If
 * they were referred, and the referral hasn't lapsed, credit the referrer's ₹
 * wallet. For Yoga Therapy specifically, only rewards if the referee was
 * actually recommended — a referral must never pay off a therapy sign-up that
 * skipped assessment.
 */
export async function markReferralConverted(refereeId: string, planDbType?: PlanType): Promise<void> {
    const ref = await prisma.referral.findUnique({ where: { refereeId } });
    if (!ref) return;

    const status = await expireIfNeeded(ref);
    if (status !== ReferralStatus.PENDING) return;

    if (planDbType === 'YOGA_THERAPY') {
        const intake = await prisma.therapyIntake.findUnique({ where: { userId: refereeId }, select: { status: true } });
        const recommended =
            intake?.status === TherapyIntakeStatus.RECOMMENDED ||
            intake?.status === TherapyIntakeStatus.RECOMMENDED_WITH_CONDITIONS;
        if (!recommended) return; // leave PENDING — they may still convert via Everyday Yoga later
    }

    const { referrerReward } = await getReferralSettings();

    await prisma.$transaction([
        prisma.referral.update({
            where: { id: ref.id },
            data: {
                status: ReferralStatus.SUCCESSFUL,
                convertedAt: new Date(),
                rewardedAt: new Date(),
                rewardAmount: referrerReward,
            },
        }),
        prisma.user.update({
            where: { id: ref.referrerId },
            data: { referralCreditBalance: { increment: referrerReward } },
        }),
    ]);

    void recordEvent('referral_converted', {
        userId: ref.referrerId,
        metadata: { stage: 'paid', refereeId, rewardAmount: referrerReward },
    });
    posthogCapture(ref.referrerId, 'referral_converted', { referee_id: refereeId, reward_amount: referrerReward });
}

export type ReversalResult =
    | { ok: true }
    | { ok: false; error: string };

/** Admin-triggered clawback (refund / abuse) — only meaningful for an already-rewarded referral. */
export async function reverseReferral(referralId: string, adminId: string, adminEmail?: string | null): Promise<ReversalResult> {
    const ref = await prisma.referral.findUnique({ where: { id: referralId } });
    if (!ref) return { ok: false, error: 'Referral not found.' };
    if (ref.status !== ReferralStatus.SUCCESSFUL) {
        return { ok: false, error: 'Only a successful (rewarded) referral can be reversed.' };
    }

    await prisma.$transaction([
        prisma.referral.update({
            where: { id: referralId },
            data: { status: ReferralStatus.REVERSED, reversedAt: new Date() },
        }),
        prisma.user.update({
            where: { id: ref.referrerId },
            data: { referralCreditBalance: { decrement: ref.rewardAmount } },
        }),
    ]);

    await recordAudit({
        actorId: adminId,
        actorEmail: adminEmail,
        action: 'referral.reversed',
        entity: 'Referral',
        entityId: referralId,
        before: { status: ref.status, rewardAmount: ref.rewardAmount },
        after: { status: 'REVERSED' },
    });

    return { ok: true };
}

export async function setReferralFlag(referralId: string, flagged: boolean): Promise<void> {
    await prisma.referral.update({ where: { id: referralId }, data: { flagged } });
}

export interface ReferralRow {
    id: string;
    refereeName: string;
    status: ReferralStatus;
    rewardAmount: number;
    createdAt: Date;
}

export interface ReferralStats {
    code: string;
    link: string;
    message: string;
    creditBalance: number;
    referrerReward: number;
    refereeDiscount: number;
    referrals: ReferralRow[];
}

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://shaktiyoga.in').replace(/\/$/, '');

export async function referralStats(userId: string): Promise<ReferralStats> {
    const [code, rows, me, settings] = await Promise.all([
        getOrCreateReferralCode(userId),
        prisma.referral.findMany({
            where: { referrerId: userId },
            include: { referee: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { referralCreditBalance: true } }),
        getReferralSettings(),
    ]);

    // Lazily settle any lapsed referrals so the table reads correctly without a cron.
    const referrals: ReferralRow[] = [];
    for (const r of rows) {
        const status = await expireIfNeeded(r);
        referrals.push({ id: r.id, refereeName: r.referee.name, status, rewardAmount: r.rewardAmount, createdAt: r.createdAt });
    }

    return {
        code,
        link: `${APP_URL}/r/${code}`,
        message:
            `I've been practising with Shakti Yoga — live classes every day + 1:1 yoga therapy. ` +
            `Use my code ${code} and get ₹${settings.refereeDiscount} off your first membership: ${APP_URL}/r/${code}`,
        creditBalance: me?.referralCreditBalance ?? 0,
        referrerReward: settings.referrerReward,
        refereeDiscount: settings.refereeDiscount,
        referrals,
    };
}
