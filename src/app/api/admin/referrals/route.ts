import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { getClientIp } from '@/lib/rate-limit';
import { recordAudit } from '@/lib/audit';
import { getReferralSettings, setSetting } from '@/lib/settings';
import { ReferralStatus } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
    if (!(await requireAdmin())) return forbidden();

    const [referrals, settings] = await Promise.all([
        prisma.referral.findMany({
            include: {
                referrer: { select: { name: true, email: true } },
                referee: { select: { name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        }),
        getReferralSettings(),
    ]);

    const now = Date.now();
    const effective = (r: (typeof referrals)[number]): ReferralStatus =>
        r.status === ReferralStatus.PENDING && r.expiresAt.getTime() < now ? ReferralStatus.EXPIRED : r.status;

    const successful = referrals.filter((r) => effective(r) === ReferralStatus.SUCCESSFUL).length;
    const creditsIssued = referrals.reduce((sum, r) => sum + (r.status === ReferralStatus.SUCCESSFUL ? r.rewardAmount : 0), 0);

    return NextResponse.json({
        settings,
        referrals: referrals.map((r) => ({
            id: r.id,
            referrerName: r.referrer.name,
            referrerEmail: r.referrer.email,
            refereeName: r.referee.name,
            refereeEmail: r.referee.email,
            status: effective(r),
            rewardAmount: r.rewardAmount,
            refereeDiscountAmount: r.refereeDiscountAmount,
            flagged: r.flagged,
            expiresAt: r.expiresAt,
            convertedAt: r.convertedAt,
            reversedAt: r.reversedAt,
            createdAt: r.createdAt,
        })),
        stats: {
            total: referrals.length,
            successful,
            conversionRate: referrals.length > 0 ? Math.round((successful / referrals.length) * 100) : 0,
            creditsIssued,
        },
    });
}

/** PATCH /api/admin/referrals — update the referral reward settings. */
export async function PATCH(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();

    const body = await request.json().catch(() => ({}));
    const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 0 ? n : null;
    };
    const referrerReward = num(body.referrerReward);
    const refereeDiscount = num(body.refereeDiscount);
    const validityDays = num(body.validityDays);
    if (referrerReward === null || refereeDiscount === null || validityDays === null || validityDays < 1) {
        return NextResponse.json({ error: 'All values must be non-negative numbers; validity must be at least 1 day.' }, { status: 400 });
    }

    const before = await getReferralSettings();
    await Promise.all([
        setSetting('referral_referrer_reward', String(Math.round(referrerReward))),
        setSetting('referral_referee_discount', String(Math.round(refereeDiscount))),
        setSetting('referral_validity_days', String(Math.round(validityDays))),
    ]);
    const after = await getReferralSettings();

    await recordAudit({
        actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
        action: 'referral.settings.update', entity: 'Setting', entityId: 'referral',
        before, after,
    });

    return NextResponse.json({ settings: after });
}
