import { prisma } from '@/lib/prisma';
import { getPlan, isPlanKey } from '@/lib/pricing';
import { activatePlan, SubscriptionProviderConflictError } from '@/lib/subscription';
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
        try {
            await activatePlan(sub.userId, plan, {
                recurring: false,
                amount: sub.amount ?? undefined,
                currency: sub.currency,
            });
        } catch (err) {
            if (err instanceof SubscriptionProviderConflictError) {
                // One user's unresolved provider conflict shouldn't block
                // everyone else's scheduled downgrade in the same batch run.
                console.error(`[subscription-maintenance] provider conflict for user ${sub.userId}: ${err.message}`);
                continue;
            }
            throw err;
        }
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
