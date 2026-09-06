import { prisma } from '@/lib/prisma';
import type { ClassBatch, ClassInstance } from '@prisma/client';

/**
 * Class scheduling helpers.
 *
 * All classes run on IST (Asia/Kolkata, a fixed UTC+05:30 with no DST), so we do
 * the timezone maths by hand rather than pulling in a tz library. `ClassInstance.date`
 * always stores the class *start* as a UTC instant.
 */

const IST_OFFSET_MIN = 5 * 60 + 30; // +05:30
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Parse a "06:30 AM" / "6:00 PM" time-slot string into { hour, minute } (24h).
 * Tolerates a trailing timezone label (e.g. "06:00 AM IST") since some stored
 * rows carry one.
 */
export function parseTimeSlot(slot: string): { hour: number; minute: number } {
    const m = slot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?(?:\s+[A-Za-z]{2,4})?$/i);
    if (!m) throw new Error(`Unrecognised time slot: "${slot}"`);
    let hour = parseInt(m[1], 10);
    const minute = parseInt(m[2], 10);
    const ampm = m[3]?.toUpperCase();
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return { hour, minute };
}

/** The UTC instant for a given IST wall-clock date + time. */
export function istToUtc(year: number, month1: number, day: number, hour: number, minute: number): Date {
    return new Date(Date.UTC(year, month1 - 1, day, hour, minute) - IST_OFFSET_MIN * 60_000);
}

/** IST calendar parts (year, month 1-indexed, day, weekday short name) for a UTC instant. */
export function istParts(instant: Date) {
    const shifted = new Date(instant.getTime() + IST_OFFSET_MIN * 60_000);
    return {
        year: shifted.getUTCFullYear(),
        month1: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
        weekday: DAY_NAMES[shifted.getUTCDay()],
    };
}

/** Resolve the Google Meet URL for an instance: per-instance override, else batch default. */
export function resolveMeetingLink(
    instance: Pick<ClassInstance, 'meetingLink'> & { batch: Pick<ClassBatch, 'meetingLink'> },
): string | null {
    return instance.meetingLink ?? instance.batch.meetingLink ?? null;
}

/**
 * The window during which a class can be joined: from 15 min before the start
 * to 15 min after the scheduled end.
 */
export function joinWindow(
    instance: Pick<ClassInstance, 'date'>,
    batch: Pick<ClassBatch, 'durationMin'>,
): { opensAt: Date; closesAt: Date } {
    const start = instance.date.getTime();
    return {
        opensAt: new Date(start - 15 * 60_000),
        closesAt: new Date(start + (batch.durationMin + 15) * 60_000),
    };
}

export function isJoinable(
    instance: Pick<ClassInstance, 'date'>,
    batch: Pick<ClassBatch, 'durationMin'>,
    now: Date = new Date(),
): boolean {
    const { opensAt, closesAt } = joinWindow(instance, batch);
    return now >= opensAt && now <= closesAt;
}

/**
 * Materialise `ClassInstance` rows for every active batch across the next
 * `daysAhead` days (inclusive of today). Idempotent — safe to call on every
 * request and from cron. Returns the number of instances created.
 */
export async function ensureInstances(daysAhead = 7): Promise<number> {
    // Only group classes are materialised — Yoga Therapy is strictly 1:1 (Booking).
    const batches = await prisma.classBatch.findMany({
        where: { active: true, planType: 'EVERYDAY_YOGA' },
    });
    if (batches.length === 0) return 0;

    const today = istParts(new Date());
    // Anchor at IST midday so day-offset arithmetic never lands us on the wrong date.
    const anchor = istToUtc(today.year, today.month1, today.day, 12, 0);

    const wanted: { batchId: string; date: Date }[] = [];
    for (let offset = 0; offset <= daysAhead; offset++) {
        const { year, month1, day, weekday } = istParts(new Date(anchor.getTime() + offset * 86_400_000));
        for (const batch of batches) {
            if (!batch.daysOfWeek.includes(weekday)) continue;
            let time: { hour: number; minute: number };
            try {
                time = parseTimeSlot(batch.timeSlot);
            } catch {
                continue; // skip a batch with an unparseable slot rather than fail the whole run
            }
            wanted.push({ batchId: batch.id, date: istToUtc(year, month1, day, time.hour, time.minute) });
        }
    }
    if (wanted.length === 0) return 0;

    const earliest = wanted.reduce((min, w) => (w.date < min ? w.date : min), wanted[0].date);
    const existing = await prisma.classInstance.findMany({
        where: { date: { gte: earliest }, batchId: { in: batches.map((b) => b.id) } },
        select: { batchId: true, date: true },
    });
    const seen = new Set(existing.map((e) => `${e.batchId}|${e.date.getTime()}`));

    const toCreate = wanted.filter((w) => !seen.has(`${w.batchId}|${w.date.getTime()}`));
    if (toCreate.length === 0) return 0;

    const { count } = await prisma.classInstance.createMany({
        data: toCreate.map((w) => ({ batchId: w.batchId, date: w.date, status: 'Scheduled' })),
        skipDuplicates: true,
    });
    return count;
}
