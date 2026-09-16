/**
 * Send "starts in 30 minutes" pushes for group classes and 1:1 sessions.
 *
 * Run every 5-10 minutes — idempotent (claims via `remindedAt`), so a shorter
 * or overlapping interval never double-sends:
 *   *\/10 * * * * cd /root/shaktiyoga/app && node_modules/.bin/tsx scripts/class-reminders.ts >> /var/log/shakti-cron.log 2>&1
 */
import { prisma } from '../src/lib/prisma';
import { sendDueClassReminders } from '../src/lib/class-reminders';

async function main() {
    const result = await sendDueClassReminders();
    console.log(`[class-reminders] ${new Date().toISOString()} — classes=${result.classes} sessions=${result.sessions}`);
}

main()
    .catch((err) => {
        console.error('[class-reminders] failed:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
