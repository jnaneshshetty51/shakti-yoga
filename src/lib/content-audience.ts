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
 * A Content `where` fragment that hides expired items and items targeted at a
 * plan tier the caller isn't on. Empty `audience` = everyone.
 */
export async function audienceWhere(userId: string | null): Promise<Prisma.ContentWhereInput> {
    const now = new Date();
    const notExpired: Prisma.ContentWhereInput = {
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };
    const tier = await memberTier(userId);
    const audienceOk: Prisma.ContentWhereInput = tier
        ? { OR: [{ audience: { isEmpty: true } }, { audience: { has: tier } }] }
        : { audience: { isEmpty: true } };
    return { AND: [notExpired, audienceOk] };
}
