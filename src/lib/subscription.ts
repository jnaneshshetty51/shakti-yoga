import { prisma } from '@/lib/prisma';
import { signToken, mapDatabaseRole, sessionClaims, setSessionCookie } from '@/lib/auth';
import { type PlanConfig, type Region, priceFor } from '@/lib/pricing';
import { grantCycleCredits } from '@/lib/sessionCredits';
import { Role, SubscriptionStatus } from '@prisma/client';

/**
 * Lazily expire a user's subscription: if it is CANCELLED or already EXPIRED and
 * the renewal date has passed, mark it EXPIRED and drop the user back to VISITOR.
 * Safe to call on every auth check — it only writes when something actually changed.
 * Returns the (possibly updated) role in DB-enum form.
 */
export async function syncSubscriptionState(userId: string, currentRole: Role): Promise<Role> {
    if (currentRole === 'VISITOR' || currentRole === 'SUPER_ADMIN' || currentRole === 'STAFF_ADMIN' || currentRole === 'TEACHER') {
        return currentRole;
    }

    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) return currentRole;

    // Family seat: if the plan owner's subscription is no longer live, the seat
    // collapses with it — drop this member back to VISITOR immediately.
    if (sub.familyOwnerId) {
        const owner = await prisma.subscription.findUnique({
            where: { userId: sub.familyOwnerId },
            select: { status: true, renewalDate: true },
        });
        const ownerLive =
            owner != null &&
            owner.renewalDate.getTime() > Date.now() &&
            (owner.status === SubscriptionStatus.ACTIVE || owner.status === SubscriptionStatus.CANCELLED);
        if (!ownerLive) {
            await prisma.$transaction([
                prisma.subscription.update({ where: { userId }, data: { status: SubscriptionStatus.EXPIRED } }),
                prisma.user.update({ where: { id: userId }, data: { role: Role.VISITOR } }),
            ]);
            return Role.VISITOR;
        }
    }

    const pastDue = sub.renewalDate.getTime() < Date.now();
    // A cancelled sub or a lapsed free trial both drop to VISITOR once the
    // paid-through / trial date passes. EXPIRED means we already did this.
    const shouldExpire = pastDue && (
        sub.status === SubscriptionStatus.CANCELLED ||
        sub.status === SubscriptionStatus.TRIAL
    );
    const alreadyExpiredButStillPaid = sub.status === SubscriptionStatus.EXPIRED;

    if (!shouldExpire && !alreadyExpiredButStillPaid) {
        return currentRole;
    }

    await prisma.$transaction([
        prisma.subscription.update({
            where: { userId },
            data: { status: SubscriptionStatus.EXPIRED },
        }),
        prisma.user.update({
            where: { id: userId },
            data: { role: Role.VISITOR },
        }),
    ]);

    return Role.VISITOR;
}

/**
 * Activate a plan for a user: set their role, grant therapy credits, upsert the
 * subscription with a fresh renewal date (plan.renewalDays out), and re-issue the
 * session cookie so the new role/permissions take effect immediately.
 */
export async function activatePlan(
    userId: string,
    plan: PlanConfig,
    opts: {
        recurring?: boolean;
        subscriptionId?: string;
        renewalDate?: Date;
        region?: Region;
        provider?: 'razorpay' | 'apple' | 'google';
        store?: 'app_store' | 'play_store' | null;
        familyOwnerId?: string | null;
        /** override amount/currency (e.g. from a store receipt) */
        amount?: number;
        currency?: string;
        /** skip re-issuing the session cookie — set when an admin activates a plan for another user */
        skipCookie?: boolean;
    } = {},
) {
    const isTrial = plan.interval === 'trial';
    const price = priceFor(plan, opts.region ?? 'IN');
    const amount = opts.amount ?? price.amount;
    const currency = opts.currency ?? price.currency;

    // Referral credit is a ₹ wallet redeemed at checkout time (see lib/referral.ts
    // previewCheckoutDiscount/consumeCheckoutDiscount) — activation itself no
    // longer grants bonus days.
    const renewalDate = opts.renewalDate ?? (() => {
        const d = new Date();
        d.setDate(d.getDate() + (plan.renewalDays || 30));
        return d;
    })();

    // Capped group-class plans (monthly Everyday / Family) open a fresh
    // session-credit window on every activation and renewal — no rollover.
    // Uncapped plans clear the field so an upgrade from monthly → annual drops
    // the cap immediately.
    const capped = plan.sessionsPerCycle != null;
    const currentCycleStart = capped ? new Date() : null;

    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            role: plan.role,
            ...(plan.credits > 0 ? { credits: { increment: plan.credits } } : {}),
            ...(isTrial ? { trialStartedAt: new Date() } : {}),
        },
    });

    const subFields = {
        planType: plan.dbPlanType,
        planKey: plan.key,
        interval: plan.interval,
        amount,
        currency,
        status: plan.subscriptionStatus,
        renewalDate,
        currentCycleStart,
        provider: opts.provider ?? 'razorpay',
        store: opts.store ?? null,
        recurring: opts.recurring ?? false,
        familyOwnerId: opts.familyOwnerId ?? null,
        ...(opts.subscriptionId ? { billingProviderId: opts.subscriptionId } : {}),
    };

    await prisma.subscription.upsert({
        where: { userId },
        create: { userId, ...subFields },
        update: subFields,
    });

    if (capped && currentCycleStart) {
        await grantCycleCredits(userId, plan, currentCycleStart);
    }

    const mappedRole = mapDatabaseRole(user.role);

    if (!opts.skipCookie) {
        await setSessionCookie(await signToken(sessionClaims(user)));
    }

    return { user, mappedRole };
}
