import { prisma } from '@/lib/prisma';
import { getPlan, isPlanKey } from '@/lib/pricing';
import { activatePlan } from '@/lib/subscription';
import { reconcileFamilySeats } from '@/lib/family';
import { recordEvent } from '@/lib/analytics';

/**
 * Apply scheduled plan changes (Subscription.pendingPlanKey) once the current
 * paid-through period has elapsed. Recurring subs normally get this on the
 * Razorpay `subscription.charged` webhook; this is the catch-up for one-time
 * payments and for anything the webhook missed.
 */
export async function applyPendingDowngrades(): Promise<number> {
    const due = await prisma.subscription.findMany({
        where: {
            pendingPlanKey: { not: null },
            renewalDate: { lt: new Date() },
            recurring: false,
        },
    });

    let applied = 0;
    for (const sub of due) {
        if (!sub.pendingPlanKey || !isPlanKey(sub.pendingPlanKey)) {
            await prisma.subscription.update({ where: { id: sub.id }, data: { pendingPlanKey: null } });
            continue;
        }
        const plan = getPlan(sub.pendingPlanKey);
        await activatePlan(sub.userId, plan, {
            recurring: false,
            amount: sub.amount ?? undefined,
            currency: sub.currency,
        });
        await prisma.subscription.update({ where: { id: sub.id }, data: { pendingPlanKey: null } });
        void recordEvent('subscription_started', {
            userId: sub.userId,
            metadata: { plan: sub.pendingPlanKey, scheduledDowngrade: true },
        });
        applied += 1;
    }
    return applied;
}

export async function runSubscriptionMaintenance() {
    const [familySeatsExpired, downgradesApplied] = await Promise.all([
        reconcileFamilySeats(),
        applyPendingDowngrades(),
    ]);
    return { familySeatsExpired, downgradesApplied };
}
