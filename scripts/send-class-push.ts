/**
 * Push a "class starting soon" notification ~15 min before each Everyday Yoga
 * class. Runs every 5 minutes from cron; a `Setting` row per instance guarantees
 * each class is pushed only once.
 *
 *   *\/5 * * * *  cd /root/shaktiyoga/app && node_modules/.bin/tsx scripts/send-class-push.ts >> /var/log/shakti-cron.log 2>&1
 */
import { prisma } from '../src/lib/prisma';
import { ensureInstances } from '../src/lib/class-schedule';
import { eligibleEverydayMembers } from '../src/lib/class-access';
import { sendPush } from '../src/lib/push';

const LEAD_MIN = 15;
const WINDOW_MIN = 6; // must exceed the cron interval so nothing slips through

async function main() {
    await ensureInstances(1).catch(() => {});

    const now = Date.now();
    const from = new Date(now + (LEAD_MIN - WINDOW_MIN) * 60_000);
    const to = new Date(now + (LEAD_MIN + WINDOW_MIN) * 60_000);

    const instances = await prisma.classInstance.findMany({
        where: {
            date: { gte: from, lte: to },
            status: { not: 'Cancelled' },
            batch: { active: true, planType: 'EVERYDAY_YOGA' },
        },
        include: { batch: { include: { teacher: { select: { name: true } } } } },
    });

    if (instances.length === 0) {
        console.log(`[class-push] ${new Date().toISOString()} — no class in the window`);
        return;
    }

    const members = await eligibleEverydayMembers();
    const userIds = members.map((m) => m.id);

    for (const inst of instances) {
        const key = `class_push:${inst.id}`;
        const already = await prisma.setting.findUnique({ where: { key } });
        if (already) continue;

        // Claim it first so a slow send can't double-fire on the next tick.
        await prisma.setting.create({ data: { key, value: new Date().toISOString() } });

        const start = inst.date.toLocaleTimeString('en-IN', {
            hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
        });
        await sendPush(userIds, {
            title: `${inst.batch.name} starts at ${start} IST`,
            body: `Your class with ${inst.batch.teacher.name} begins in about ${LEAD_MIN} minutes. Tap to join.`,
            url: '/dashboard/classes',
            channelId: 'classes',
        });
        console.log(`[class-push] ${new Date().toISOString()} — pushed ${inst.batch.name} to ${userIds.length} member(s)`);
    }
}

main()
    .catch((err) => {
        console.error('[class-push] failed:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
