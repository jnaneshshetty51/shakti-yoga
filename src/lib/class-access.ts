import { prisma } from '@/lib/prisma';
import { Role, SubscriptionStatus } from '@prisma/client';
import { PLANS } from '@/lib/pricing';
import { getSessionBalance, type SessionBalance } from '@/lib/sessionCredits';

const STARTER_WEEKLY_LIMIT = PLANS.starter.weeklyClassLimit ?? 2;

/** UTC midnight of the Monday that starts this week. */
function weekStart(now = new Date()): Date {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d;
}

/**
 * Eligibility for the daily group class (Everyday Yoga).
 *
 * Yoga Therapy is strictly 1:1 and goes through Booking, so therapy members are
 * NOT eligible here. Group classes are only ever EVERYDAY_YOGA batches, so access
 * doesn't vary by batch — one check covers it.
 */

/** Starter members see how many of their weekly live classes they've used. */
export interface StarterUsage {
    used: number;
    limit: number;
}

export type ClassAccess =
    | { ok: true; starter?: StarterUsage; sessionBalance?: SessionBalance | null }
    | {
          ok: false;
          reason: string;
          paywall: boolean;
          starter?: StarterUsage;
          /** true = plan is valid but the per-cycle session pool is exhausted (offer EY-12, not renewal). */
          outOfSessions?: boolean;
          sessionBalance?: SessionBalance | null;
      };

const STAFF_ROLES: Role[] = [Role.SUPER_ADMIN, Role.STAFF_ADMIN, Role.TEACHER];
const VALID_SUB_STATUSES: SubscriptionStatus[] = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL];

export async function canJoinGroupClass(userId: string, excludeInstanceId?: string): Promise<ClassAccess> {
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

    const memberRoles: Role[] = [Role.MEMBER_EVERYDAY, Role.MEMBER_STARTER, Role.TRIAL];
    if (!memberRoles.includes(user.role)) {
        return {
            ok: false,
            reason: 'An active membership or trial is required to join the class.',
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

    // Starter is capped at N live classes per week.
    if (user.role === Role.MEMBER_STARTER) {
        const usedThisWeek = await prisma.classAttendance.count({
            where: { userId, joinedAt: { gte: weekStart() } },
        });
        const starter: StarterUsage = { used: usedThisWeek, limit: STARTER_WEEKLY_LIMIT };
        if (usedThisWeek >= STARTER_WEEKLY_LIMIT) {
            return {
                ok: false,
                reason: `Your Starter plan includes ${STARTER_WEEKLY_LIMIT} live classes a week. Upgrade to Everyday for unlimited classes.`,
                paywall: true,
                starter,
            };
        }
        return { ok: true, starter };
    }

    // Everyday / Family monthly plans draw from a per-cycle session pool.
    // Uncapped plans (annual, trial) return null here and fall through.
    const sessionBalance = await getSessionBalance(userId);
    if (sessionBalance) {
        // getSessionBalance only counts teacher-confirmed attendance — a
        // self-joined-but-not-yet-confirmed class doesn't debit the ledger
        // until the teacher marks it Present. Without also counting those
        // pending check-ins here, a member could join classes faster than a
        // teacher confirms them and end the cycle over the cap. This only
        // tightens the join gate; the real deduction still happens on
        // confirmation, so nothing here writes to the credit ledger.
        // Exclude the instance being (re-)joined right now — a member
        // re-opening a class they already checked into shouldn't be penalized
        // twice for the same one.
        const pendingCheckIns = sub?.currentCycleStart
            ? await prisma.classAttendance.count({
                  where: {
                      userId, status: 'CHECKED_IN', joinedAt: { gte: sub.currentCycleStart },
                      ...(excludeInstanceId ? { classInstanceId: { not: excludeInstanceId } } : {}),
                  },
              })
            : 0;
        const effectiveRemaining = sessionBalance.remaining - pendingCheckIns;
        if (effectiveRemaining <= 0) {
            const refresh = new Date(sessionBalance.cycleEnd).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
            });
            return {
                ok: false,
                reason: `You've used all ${sessionBalance.perCycle} sessions in this cycle. They refresh on ${refresh}.`,
                paywall: true,
                outOfSessions: true,
                sessionBalance,
            };
        }
    }

    return { ok: true, sessionBalance };
}

/**
 * Everyone currently entitled to the daily group class: everyday members and
 * trial users with a live subscription. Used for class reminders / cancellations.
 */
export async function eligibleEverydayMembers(): Promise<{ id: string; email: string; name: string }[]> {
    return prisma.user.findMany({
        where: {
            role: { in: [Role.MEMBER_EVERYDAY, Role.MEMBER_STARTER, Role.TRIAL] },
            subscription: {
                status: { in: VALID_SUB_STATUSES },
                renewalDate: { gt: new Date() },
            },
        },
        select: { id: true, email: true, name: true },
    });
}
