import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { getClientIp } from '@/lib/rate-limit';
import { recordAudit } from '@/lib/audit';
import { getReferralSettings, setSetting } from '@/lib/settings';
import { Prisma, ReferralStatus } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
    if (!(await requireAdmin())) return forbidden();

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE));
    const q = url.searchParams.get('q')?.trim();
    const statusFilter = url.searchParams.get('status'); // 'PENDING' | 'SUCCESSFUL' | 'EXPIRED' | 'REVERSED'

    const now = new Date();
    // The `status` shown to admins is an "effective" status, not the literal
    // column: a still-PENDING row whose validity window has lapsed displays
    // (and should filter) as EXPIRED even though nothing has written EXPIRED
    // to the row yet — the reverse cron job does that lazily. Reproduce that
    // here rather than filtering on the raw column.
    const statusWhere: Prisma.ReferralWhereInput | undefined =
        statusFilter === 'PENDING' ? { status: 'PENDING', expiresAt: { gte: now } }
            : statusFilter === 'EXPIRED' ? { OR: [{ status: 'EXPIRED' }, { status: 'PENDING', expiresAt: { lt: now } }] }
                : statusFilter === 'SUCCESSFUL' ? { status: 'SUCCESSFUL' }
                    : statusFilter === 'REVERSED' ? { status: 'REVERSED' }
                        : undefined;

    const where: Prisma.ReferralWhereInput = {
        ...(statusWhere ?? {}),
        ...(q ? {
            OR: [
                { referrer: { name: { contains: q, mode: 'insensitive' } } },
                { referrer: { email: { contains: q, mode: 'insensitive' } } },
                { referee: { name: { contains: q, mode: 'insensitive' } } },
                { referee: { email: { contains: q, mode: 'insensitive' } } },
            ],
        } : {}),
    };

    // Stats are a program-wide summary, independent of the table's own
    // search/filter — computed straight from aggregates rather than pulling
    // every referral into memory the way the pre-pagination version did.
    const [referrals, totalCount, totalAll, successfulAgg, settings] = await Promise.all([
        prisma.referral.findMany({
            where,
            include: {
                referrer: { select: { name: true, email: true } },
                referee: { select: { name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.referral.count({ where }),
        prisma.referral.count(),
        prisma.referral.aggregate({ where: { status: ReferralStatus.SUCCESSFUL }, _count: true, _sum: { rewardAmount: true } }),
        getReferralSettings(),
    ]);

    const effective = (r: (typeof referrals)[number]): ReferralStatus =>
        r.status === ReferralStatus.PENDING && r.expiresAt.getTime() < now.getTime() ? ReferralStatus.EXPIRED : r.status;

    const successful = successfulAgg._count;
    const creditsIssued = successfulAgg._sum.rewardAmount ?? 0;

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
        page,
        pageSize,
        totalCount,
        stats: {
            total: totalAll,
            successful,
            conversionRate: totalAll > 0 ? Math.round((successful / totalAll) * 100) : 0,
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
