/**
 * Publish Content whose scheduled time has arrived.
 *
 * Run on a schedule so scheduled posts go live without site traffic:
 *   *\/10 * * * * cd /root/shaktiyoga/app && node_modules/.bin/tsx scripts/publish-scheduled-content.ts >> /var/log/shakti-cron.log 2>&1
 */
import { prisma } from '../src/lib/prisma';
import { publishScheduledContent } from '../src/lib/content-schedule';

async function main() {
    const published = await publishScheduledContent();
    console.log(`[publish-scheduled] ${new Date().toISOString()} — published ${published} item(s)`);
}

main()
    .catch((err) => {
        console.error('[publish-scheduled] failed:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
