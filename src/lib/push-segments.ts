import { prisma } from '@/lib/prisma';
import { Role, SubscriptionStatus, PlanType, type Prisma } from '@prisma/client';

/**
 * Audience segments for admin-initiated push broadcasts and retention actions.
 * `resolveSegment` returns the user ids in a segment; `sendPush` then filters to
 * the ones with a registered device.
 */

export const PUSH_SEGMENTS = [
    'all',
    'everyday',
    'starter',
    'therapy',
    'trial',
    'family',
    'inactive',
    'at_risk',
] as const;
export type PushSegment = (typeof PUSH_SEGMENTS)[number];

export const SEGMENT_LABEL: Record<PushSegment, string> = {
    all: 'Everyone with the app',
    everyday: 'Everyday Yoga members',
    starter: 'Starter members',
    therapy: 'Yoga Therapy members',
    trial: 'Trial users',
    family: 'Family plan members',
    inactive: 'Lapsed members',
    at_risk: 'At-risk (no class in 14 days)',
};

export function isPushSegment(v: unknown): v is PushSegment {
    return typeof v === 'string' && (PUSH_SEGMENTS as readonly string[]).includes(v);
}

const DAY = 86_400_000;
const ACTIVE_SUB = {
    status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
    renewalDate: { gt: new Date() },
};
const MEMBER_ROLES = [Role.MEMBER_EVERYDAY, Role.MEMBER_STARTER, Role.MEMBER_THERAPY];

async function ids(where: Prisma.UserWhereInput): Promise<string[]> {
    const rows = await prisma.user.findMany({ where, select: { id: true } });
    return rows.map((r) => r.id);
}

export async function resolveSegment(segment: PushSegment): Promise<string[]> {
    const now = new Date();

    switch (segment) {
        case 'all': {
            const rows = await prisma.pushToken.findMany({ select: { userId: true }, distinct: ['userId'] });
            return rows.map((r) => r.userId);
        }
        case 'everyday':
            return ids({ role: Role.MEMBER_EVERYDAY, subscription: ACTIVE_SUB, active: true });
        case 'starter':
            return ids({ role: Role.MEMBER_STARTER, subscription: ACTIVE_SUB, active: true });
        case 'therapy':
            return ids({ role: Role.MEMBER_THERAPY, subscription: ACTIVE_SUB, active: true });
        case 'trial':
            return ids({ role: Role.TRIAL, active: true });
        case 'family':
            return ids({ subscription: { planType: PlanType.FAMILY, ...ACTIVE_SUB }, active: true });
        case 'inactive':
            return ids({
                role: { in: MEMBER_ROLES },
                active: true,
                OR: [
                    { subscription: null },
                    { subscription: { status: { in: [SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELLED] } } },
                    { subscription: { renewalDate: { lt: now } } },
                ],
            });
        case 'at_risk': {
            const active = await ids({
                role: { in: [Role.MEMBER_EVERYDAY, Role.MEMBER_STARTER] },
                subscription: ACTIVE_SUB,
                active: true,
            });
            if (active.length === 0) return [];
            const cutoff = new Date(now.getTime() - 14 * DAY);
            const recent = await prisma.classAttendance.findMany({
                where: { userId: { in: active }, joinedAt: { gte: cutoff } },
                select: { userId: true },
                distinct: ['userId'],
            });
            const seen = new Set(recent.map((r) => r.userId));
            return active.filter((id) => !seen.has(id));
        }
    }
}

/** How many users in the list have at least one registered device. */
export async function countWithTokens(userIds: string[]): Promise<number> {
    if (userIds.length === 0) return 0;
    const rows = await prisma.pushToken.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true },
        distinct: ['userId'],
    });
    return rows.length;
}
