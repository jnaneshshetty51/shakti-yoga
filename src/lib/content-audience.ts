import { prisma } from '@/lib/prisma';
import { getPlan } from '@/lib/pricing';
import type { Prisma, PlanType, Role } from '@prisma/client';

const TIER_BY_PLAN_TYPE: Record<PlanType, string> = {
    EVERYDAY_YOGA: 'everyday',
    YOGA_THERAPY: 'therapy',
    STARTER: 'starter',
    FAMILY: 'family',
    TRIAL: 'trial',
};
const TIER_BY_ROLE: Partial<Record<Role, string>> = {
    MEMBER_EVERYDAY: 'everyday',
    MEMBER_STARTER: 'starter',
    MEMBER_THERAPY: 'therapy',
    TRIAL: 'trial',
};

export const PLAN_TIERS = ['starter', 'everyday', 'family', 'therapy', 'trial'];

/** The plan tier a member counts as for content targeting, or null. */
export async function memberTier(userId: string | null): Promise<string | null> {
    if (!userId) return null;
    const now = new Date();
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, subscription: { select: { planKey: true, planType: true, status: true, renewalDate: true } } },
    });
    if (!user) return null;

    const sub = user.subscription;
    const live = sub && ['ACTIVE', 'TRIAL', 'PAUSED'].includes(sub.status) && sub.renewalDate > now;
    if (live && sub) {
        if (sub.planKey) return getPlan(sub.planKey).tier;
        return TIER_BY_PLAN_TYPE[sub.planType] ?? null;
    }
    return TIER_BY_ROLE[user.role] ?? null;
}

/**
 * A Content `where` fragment enforcing both scheduling (hides expired items)
 * and membership gating (`access`, narrowed by `audience` when `access` is
 * MEMBERSHIP_REQUIRED). This is the server-side enforcement point — access is
 * never just hidden client-side. Callers: every read path that lists or
 * fetches Content (feed, home, saved, the public [id]/[slug] route, and the
 * practice-type list/detail routes which query Content under the hood).
 */
export async function audienceWhere(userId: string | null): Promise<Prisma.ContentWhereInput> {
    const now = new Date();
    const notExpired: Prisma.ContentWhereInput = {
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };

    const tier = await memberTier(userId);
    const accessOk: Prisma.ContentWhereInput = {
        OR: [
            { access: 'PUBLIC' },
            ...(userId ? [{ access: 'ACCOUNT_REQUIRED' as const }] : []),
            ...(tier
                ? [{ access: 'MEMBERSHIP_REQUIRED' as const, OR: [{ audience: { isEmpty: true } }, { audience: { has: tier } }] }]
                : []),
            ...(tier === 'therapy' ? [{ access: 'THERAPY_ONLY' as const }] : []),
        ],
    };

    return { AND: [notExpired, accessOk] };
}

/** Whether a single already-fetched Content row is visible to this caller — for a single-item route where a full query filter isn't available (e.g. after a lookup by slug). */
export async function canAccessContent(
    userId: string | null,
    row: { access: string; audience: string[]; expiresAt: Date | null },
): Promise<boolean> {
    if (row.expiresAt && row.expiresAt <= new Date()) return false;
    if (row.access === 'PUBLIC') return true;
    if (row.access === 'ACCOUNT_REQUIRED') return !!userId;
    const tier = await memberTier(userId);
    if (row.access === 'THERAPY_ONLY') return tier === 'therapy';
    if (row.access === 'MEMBERSHIP_REQUIRED') return !!tier && (row.audience.length === 0 || row.audience.includes(tier));
    return false;
}
