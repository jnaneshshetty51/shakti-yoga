import { prisma } from '@/lib/prisma';
import { sendPush } from '@/lib/push';
import { pushTemplates } from '@/lib/push-templates';

/** How long before start a reminder goes out. */
const REMINDER_MINUTES = 30;
/** Group classes are open drop-in, not pre-booked — "regulars" (attended this
 *  specific batch at least once in this window) stands in for a real roster,
 *  so a member who only ever attends the evening slot isn't pinged about the
 *  6am one too. */
const REGULAR_WINDOW_DAYS = 30;

/**
 * Send "starts in N minutes" pushes for group classes and 1:1 sessions that
 * are due and haven't been reminded yet. Idempotent per instance/booking via
 * an atomic `remindedAt` claim (same pattern as content-notify.ts's
 * `notifiedAt`) — safe to call from a cron on any interval shorter than
 * REMINDER_MINUTES without double-sending.
 */
export async function sendDueClassReminders(now: Date = new Date()): Promise<{ classes: number; sessions: number }> {
    const dueBy = new Date(now.getTime() + REMINDER_MINUTES * 60_000);

    const dueInstances = await prisma.classInstance.findMany({
        where: { date: { gt: now, lte: dueBy }, status: { not: 'Cancelled' }, remindedAt: null },
        select: {
            id: true,
            batchId: true,
            date: true,
            teacher: { select: { name: true } },
            batch: { select: { name: true, teacher: { select: { name: true } } } },
        },
    });

    let classesSent = 0;
    for (const instance of dueInstances) {
        const claim = await prisma.classInstance.updateMany({
            where: { id: instance.id, remindedAt: null },
            data: { remindedAt: now },
        });
        if (claim.count === 0) continue; // a concurrent run already claimed this one

        const since = new Date(now.getTime() - REGULAR_WINDOW_DAYS * 86_400_000);
        const regulars = await prisma.classAttendance.findMany({
            where: { classInstance: { batchId: instance.batchId }, joinedAt: { gte: since } },
            select: { userId: true },
            distinct: ['userId'],
        });
        if (regulars.length === 0) continue;

        const minutes = Math.max(1, Math.round((instance.date.getTime() - now.getTime()) / 60_000));
        const effectiveTeacherName = instance.teacher?.name ?? instance.batch.teacher?.name;
        await sendPush(
            regulars.map((r) => r.userId),
            pushTemplates.classStartingSoon(instance.batch.name, minutes, effectiveTeacherName),
        ).catch((e) => console.error('[class-reminders] push failed for instance', instance.id, e));
        classesSent += 1;
    }

    const dueBookings = await prisma.booking.findMany({
        where: { date: { gt: now, lte: dueBy }, status: 'CONFIRMED', remindedAt: null },
        select: { id: true, userId: true, date: true, teacher: { select: { name: true } } },
    });

    let sessionsSent = 0;
    for (const booking of dueBookings) {
        const claim = await prisma.booking.updateMany({
            where: { id: booking.id, remindedAt: null },
            data: { remindedAt: now },
        });
        if (claim.count === 0) continue;

        const minutes = Math.max(1, Math.round((booking.date.getTime() - now.getTime()) / 60_000));
        await sendPush(booking.userId, pushTemplates.sessionStartingSoon(minutes, booking.teacher?.name))
            .catch((e) => console.error('[class-reminders] push failed for booking', booking.id, e));
        sessionsSent += 1;
    }

    return { classes: classesSent, sessions: sessionsSent };
}
