/**
 * Materialise upcoming ClassInstance rows from the active batch schedule.
 *
 * Run on a schedule so the daily class always exists even with no site traffic:
 *   *\/30 * * * * cd /root/shaktiyoga/app && node_modules/.bin/tsx scripts/ensure-instances.ts >> /var/log/shakti-cron.log 2>&1
 */
import { prisma } from '../src/lib/prisma';
import { ensureInstances } from '../src/lib/class-schedule';

async function main() {
    const created = await ensureInstances(14);
    console.log(`[ensure-instances] ${new Date().toISOString()} — created ${created} instance(s)`);
}

main()
    .catch((err) => {
        console.error('[ensure-instances] failed:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
