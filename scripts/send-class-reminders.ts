/**
 * Morning email to every eligible member: today's Everyday Yoga class + a link
 * to the dashboard (never the raw Meet URL — the gate stays server-side).
 *
 * Run once each morning IST:
 *   30 0 * * *  (00:30 UTC = 06:00 IST)  cd /root/shaktiyoga/app && node_modules/.bin/tsx scripts/send-class-reminders.ts >> /var/log/shakti-cron.log 2>&1
 */
import { prisma } from '../src/lib/prisma';
import { sendEmail, emailLayout, isEmailConfigured } from '../src/lib/email';
import { istParts, ensureInstances } from '../src/lib/class-schedule';
import { SITE_URL } from '../src/lib/site';
import { SubscriptionStatus } from '@prisma/client';

async function main() {
    if (!isEmailConfigured()) {
        console.log(`[class-reminders] ${new Date().toISOString()} — RESEND_API_KEY unset, nothing sent`);
        return;
    }

    await ensureInstances(2).catch(() => { });

    const now = new Date();
    const today = istParts(now);

    // Today's remaining Everyday Yoga instances (start still ahead, or within the last hour).
    const instances = await prisma.classInstance.findMany({
        where: {
            status: { not: 'Cancelled' },
            date: { gte: new Date(now.getTime() - 3_600_000) },
            batch: { active: true, planType: 'EVERYDAY_YOGA' },
        },
        include: { batch: { include: { teacher: { select: { name: true } } } } },
        orderBy: { date: 'asc' },
    });
    const todays = instances.filter((i) => {
        const d = istParts(i.date);
        return d.year === today.year && d.month1 === today.month1 && d.day === today.day;
    });

    if (todays.length === 0) {
        console.log(`[class-reminders] ${new Date().toISOString()} — no class today`);
        return;
    }

    const lines = todays
        .map((i) => {
            const start = new Date(i.date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
            const end = new Date(i.date.getTime() + i.batch.durationMin * 60_000).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
            return `<li><strong>${i.batch.name}</strong> — ${start}–${end} IST with ${i.batch.teacher.name}</li>`;
        })
        .join('');

    // Eligible members: everyday members + trial users with a live subscription.
    const members = await prisma.user.findMany({
        where: {
            role: { in: ['MEMBER_EVERYDAY', 'TRIAL'] },
            subscription: {
                status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
                renewalDate: { gt: now },
            },
        },
        select: { email: true, name: true },
    });

    console.log(`[class-reminders] ${new Date().toISOString()} — ${todays.length} class(es), ${members.length} recipient(s)`);

    let sent = 0;
    for (const m of members) {
        const ok = await sendEmail({
            to: m.email,
            subject: `Today's yoga class`,
            html: emailLayout(
                `<p>Good morning ${m.name.split(' ')[0] || 'there'},</p>
                 <p>Today's live class${todays.length > 1 ? 'es' : ''}:</p>
                 <ul>${lines}</ul>
                 <p><a href="${SITE_URL}/dashboard" style="color:#4A6741;font-weight:bold">Open your dashboard</a> a few minutes before the start time and tap <strong>Join Google Meet</strong>.</p>
                 <p>See you on the mat. 🧘</p>`,
            ),
        });
        if (ok) sent++;
    }
    console.log(`[class-reminders] delivered ${sent}/${members.length}`);
}

main()
    .catch((err) => {
        console.error('[class-reminders] failed:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
