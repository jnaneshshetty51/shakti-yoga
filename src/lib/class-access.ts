import { prisma } from '@/lib/prisma';
import { Role, SubscriptionStatus } from '@prisma/client';

/**
 * Eligibility for the daily group class (Everyday Yoga).
 *
 * Yoga Therapy is strictly 1:1 and goes through Booking, so therapy members are
 * NOT eligible here. Group classes are only ever EVERYDAY_YOGA batches, so access
 * doesn't vary by batch — one check covers it.
 */

export type ClassAccess =
    | { ok: true }
    | { ok: false; reason: string; paywall: boolean };

const STAFF_ROLES: Role[] = [Role.SUPER_ADMIN, Role.STAFF_ADMIN, Role.TEACHER];
const VALID_SUB_STATUSES: SubscriptionStatus[] = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL];

export async function canJoinGroupClass(userId: string): Promise<ClassAccess> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
    });

    if (!user) return { ok: false, reason: 'Account not found.', paywall: false };

    if (STAFF_ROLES.includes(user.role)) return { ok: true };

    if (user.role === Role.MEMBER_THERAPY) {
        return {
            ok: false,
            reason: 'Your plan covers 1:1 therapy sessions, which are booked individually.',
            paywall: false,
        };
    }

    if (user.role !== Role.MEMBER_EVERYDAY && user.role !== Role.TRIAL) {
        return {
            ok: false,
            reason: 'An active Everyday Yoga membership or trial is required to join the class.',
            paywall: true,
        };
    }

    const sub = user.subscription;
    const active =
        !!sub &&
        VALID_SUB_STATUSES.includes(sub.status) &&
        sub.renewalDate.getTime() > Date.now();

    if (!active) {
        return {
            ok: false,
            reason: 'Your membership has expired. Renew to rejoin the daily class.',
            paywall: true,
        };
    }

    return { ok: true };
}
