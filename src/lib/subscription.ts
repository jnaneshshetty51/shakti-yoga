import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { signToken, mapDatabaseRole } from '@/lib/auth';
import type { PlanConfig } from '@/lib/pricing';
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

    const pastDue = sub.renewalDate.getTime() < Date.now();
    const shouldExpire = sub.status === SubscriptionStatus.CANCELLED && pastDue;
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
 * subscription with a fresh 30-day renewal date, and re-issue the session cookie
 * so the new role/permissions take effect immediately.
 */
export async function activatePlan(
    userId: string,
    plan: PlanConfig,
    opts: { recurring?: boolean; subscriptionId?: string; renewalDate?: Date } = {},
) {
    const renewalDate = opts.renewalDate ?? (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d;
    })();

    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            role: plan.role,
            ...(plan.credits > 0 ? { credits: { increment: plan.credits } } : {}),
        },
    });

    const subFields = {
        planType: plan.dbPlanType,
        amount: plan.amount,
        currency: plan.currency,
        status: plan.subscriptionStatus,
        renewalDate,
        recurring: opts.recurring ?? false,
        ...(opts.subscriptionId ? { billingProviderId: opts.subscriptionId } : {}),
    };

    await prisma.subscription.upsert({
        where: { userId },
        create: { userId, ...subFields },
        update: subFields,
    });

    const mappedRole = mapDatabaseRole(user.role);

    const newToken = await signToken({
        id: user.id,
        email: user.email,
        role: mappedRole,
        name: user.name,
    });

    const cookieStore = await cookies();
    cookieStore.set('token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
        path: '/',
    });

    return { user, mappedRole };
}
