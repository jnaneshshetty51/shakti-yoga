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
 * Parse a "06:30 AM" / "6:00 PM" / "18:30" / "6 PM" time-slot string into { hour, minute } (24h in IST).
 * Robust to:
 * - Time ranges: "06:00 AM - 07:00 AM" (extracts start time)
 * - 24-hour military time: "18:30", "06:00"
 * - Compact times without minutes: "6 PM", "6am"
 * - Trailing timezone labels (e.g. "06:00 AM IST")
 */
export function parseTimeSlot(slot: string): { hour: number; minute: number } {
    if (!slot || typeof slot !== 'string') {
        throw new Error('Time slot must be a non-empty string');
    }
    // If range like "06:00 AM - 07:00 AM" or "6:30 - 7:30 PM", take the start part
    const parts = slot.trim().split(/[-–—]/);
    let trimmed = parts[0].trim();
    const endPart = parts[1]?.trim() || '';

    // If start part lacks AM/PM but end part has AM/PM, inherit it
    if (!/(AM|PM)/i.test(trimmed) && /(AM|PM)/i.test(endPart)) {
        const ampmMatch = endPart.match(/(AM|PM)/i);
        if (ampmMatch) {
            trimmed = `${trimmed} ${ampmMatch[1]}`;
        }
    }

    // 1. Try HH:MM [AM/PM]
    const m1 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?(?:\s+[A-Za-z]{2,4})?$/i);
    if (m1) {
        let hour = parseInt(m1[1], 10);
        const minute = parseInt(m1[2], 10);
        const ampm = m1[3]?.toUpperCase();

        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;

        if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
            return { hour, minute };
        }
    }

    // 2. Try H [AM/PM] (e.g. "6 PM", "6am")
    const m2 = trimmed.match(/^(\d{1,2})\s*(AM|PM)(?:\s+[A-Za-z]{2,4})?$/i);
    if (m2) {
        let hour = parseInt(m2[1], 10);
        const ampm = m2[2].toUpperCase();
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;

        if (hour >= 0 && hour < 24) {
            return { hour, minute: 0 };
        }
    }

    throw new Error(`Unrecognised time slot: "${slot}"`);
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
    instance: Pick<ClassInstance, 'date'> & { status?: string | null },
    batch: Pick<ClassBatch, 'durationMin'>,
    now: Date = new Date(),
): boolean {
    if (instance.status) {
        const s = instance.status.toLowerCase();
        if (s === 'cancelled' || s === 'completed') {
            return false;
        }
    }
    const { opensAt, closesAt } = joinWindow(instance, batch);
    return now >= opensAt && now <= closesAt;
}

/** Helper to match a weekday against day strings of various formats ("Mon", "Monday", "mon"). */
function matchesDayOfWeek(days: string[], weekday: string): boolean {
    const target = weekday.toLowerCase().slice(0, 3);
    return days.some((d) => d.trim().toLowerCase().slice(0, 3) === target);
}

/**
 * Whether a teacher (their own batch's default, or an explicit per-instance
 * substitute) is already committed to another class OR a 1:1 therapy session
 * whose time range overlaps this one. Checked whenever an admin creates a
 * one-time instance or reschedules/reassigns an existing one. Returns a
 * human-readable conflict description, or null if there's no clash.
 */
export async function assertNoInstanceConflict(params: {
    teacherId: string;
    date: Date;
    durationMin: number;
    excludeInstanceId?: string;
}): Promise<string | null> {
    const { teacherId, date, durationMin, excludeInstanceId } = params;
    const start = date.getTime();
    const end = start + durationMin * 60_000;
    // A generous +/-24h window comfortably contains anything that could
    // overlap this one, without scanning the whole table.
    const windowStart = new Date(start - 24 * 60 * 60_000);
    const windowEnd = new Date(start + 24 * 60 * 60_000);

    // 1. Check overlapping group class instances
    const candidates = await prisma.classInstance.findMany({
        where: {
            date: { gte: windowStart, lte: windowEnd },
            status: { not: 'Cancelled' },
            ...(excludeInstanceId ? { id: { not: excludeInstanceId } } : {}),
            OR: [
                { teacherId }, // an explicit substitute assignment on some other instance
                { teacherId: null, batch: { teacherId } }, // inherits its batch's own teacher
            ],
        },
        select: { date: true, batch: { select: { name: true, durationMin: true } } },
    });

    for (const c of candidates) {
        const cStart = c.date.getTime();
        const cEnd = cStart + c.batch.durationMin * 60_000;
        if (start < cEnd && cStart < end) {
            const when = new Date(cStart).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short',
            });
            return `This teacher already has "${c.batch.name}" at ${when} IST, which overlaps.`;
        }
    }

    // 2. Check overlapping 1:1 therapy / consultation bookings
    const bookings = await prisma.booking.findMany({
        where: {
            teacherId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            date: {
                gte: new Date(start - 4 * 3_600_000),
                lte: new Date(end + 4 * 3_600_000),
            },
        },
        select: { date: true, type: true, user: { select: { name: true } } },
    });

    for (const b of bookings) {
        const bStart = b.date.getTime();
        const bEnd = bStart + 60 * 60_000; // standard 1:1 session is ~60 mins
        if (start < bEnd && bStart < end) {
            const when = new Date(bStart).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short',
            });
            const typeLabel = b.type.replace(/_/g, ' ').toLowerCase();
            return `This teacher already has a 1:1 ${typeLabel} with ${b.user?.name || 'a member'} at ${when} IST, which overlaps.`;
        }
    }

    return null;
}

/**
 * Materialise `ClassInstance` rows for every active batch across the next
 * `daysAhead` days (inclusive of today). Idempotent — safe to call on every
 * request and from cron. Returns the number of instances created.
 */
export async function ensureInstances(daysAhead = 7): Promise<number> {
    // Only group classes are materialised — Yoga Therapy is strictly 1:1 (Booking).
    // A `oneTime` batch already got its single explicit instance at creation
    // time (see api/admin/schedule/one-time) and must never have another one
    // generated for it just because its weekday/timeSlot happens to recur.
    const batches = await prisma.classBatch.findMany({
        where: { active: true, planType: { in: ['EVERYDAY_YOGA', 'TRIAL'] }, oneTime: false },
    });
    if (batches.length === 0) return 0;

    const today = istParts(new Date());
    // Anchor at IST midday so day-offset arithmetic never lands us on the wrong date.
    const anchor = istToUtc(today.year, today.month1, today.day, 12, 0);

    const wanted: { batchId: string; date: Date }[] = [];
    for (let offset = 0; offset <= daysAhead; offset++) {
        const { year, month1, day, weekday } = istParts(new Date(anchor.getTime() + offset * 86_400_000));
        for (const batch of batches) {
            const batchDays = Array.isArray(batch.daysOfWeek)
                ? batch.daysOfWeek
                : String(batch.daysOfWeek || '').split(',');
            if (!matchesDayOfWeek(batchDays, weekday)) continue;

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
