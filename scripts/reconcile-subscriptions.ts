/**
 * Reconcile family seats and apply scheduled plan downgrades.
 *
 * Run hourly so a family owner's lapse collapses their seats and scheduled
 * Everyday → Starter downgrades land on time:
 *   17 * * * * cd /root/shaktiyoga/app && node_modules/.bin/tsx scripts/reconcile-subscriptions.ts >> /var/log/shakti-cron.log 2>&1
 */
import { prisma } from '../src/lib/prisma';
import { runSubscriptionMaintenance } from '../src/lib/subscription-maintenance';

async function main() {
    const { familySeatsExpired, downgradesApplied } = await runSubscriptionMaintenance();
    console.log(
        `[reconcile-subscriptions] ${new Date().toISOString()} — ${familySeatsExpired} seat(s) expired, ${downgradesApplied} downgrade(s) applied`,
    );
}

main()
    .catch((err) => {
        console.error('[reconcile-subscriptions] failed:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
