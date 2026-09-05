import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { signToken, mapDatabaseRole } from '@/lib/auth';
import type { PlanConfig } from '@/lib/pricing';

/**
 * Activate a plan for a user: set their role, grant therapy credits, upsert the
 * subscription with a fresh 30-day renewal date, and re-issue the session cookie
 * so the new role/permissions take effect immediately.
 */
export async function activatePlan(userId: string, plan: PlanConfig) {
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 30);

    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            role: plan.role,
            ...(plan.credits > 0 ? { credits: { increment: plan.credits } } : {}),
        },
    });

    await prisma.subscription.upsert({
        where: { userId },
        create: {
            userId,
            planType: plan.dbPlanType,
            amount: plan.amount,
            currency: plan.currency,
            status: plan.subscriptionStatus,
            renewalDate,
        },
        update: {
            planType: plan.dbPlanType,
            amount: plan.amount,
            currency: plan.currency,
            status: plan.subscriptionStatus,
            renewalDate,
        },
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
