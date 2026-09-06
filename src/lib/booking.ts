import { prisma } from '@/lib/prisma';
import { parseTimeSlot, istToUtc, istParts } from '@/lib/class-schedule';
import { recordEvent } from '@/lib/analytics';

/** "08:00 AM - 08:45 AM" or "08:00 AM" -> minutes-from-midnight of the start. */
export function slotStartMinutes(slot: string): number {
    const start = slot.split(/\s*[-–]\s*/)[0];
    const { hour, minute } = parseTimeSlot(start);
    return hour * 60 + minute;
}

/** Combine a "YYYY-MM-DD" IST calendar date + a slot string into the UTC start instant. */
export function bookingInstant(dateStr: string, slot: string): Date {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new Error('date must be YYYY-MM-DD');
    const mins = slotStartMinutes(slot);
    return istToUtc(Number(m[1]), Number(m[2]), Number(m[3]), Math.floor(mins / 60), mins % 60);
}

/** "HH:MM" -> minutes from midnight. */
function hm(t: string): number {
    const m = t.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return NaN;
    return Number(m[1]) * 60 + Number(m[2]);
}
function fmtHM(mins: number): string {
    const h = Math.floor(mins / 60);
    const suf = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')} ${suf}`;
}

/**
 * Open 1:1 slots for a teacher on an IST calendar date, from TeacherAvailability
 * minus the slots already taken by a live booking. Returns slot label strings
 * like "09:00 AM - 09:45 AM".
 */
export async function availableSlots(teacherId: string, dateStr: string): Promise<string[]> {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return [];
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    const wk = istParts(istToUtc(y, mo, d, 12, 0)).weekday;

    const rules = await prisma.teacherAvailability.findMany({
        where: {
            teacherId,
            active: true,
            OR: [
                { dayOfWeek: wk, date: null },
                { date: istToUtc(y, mo, d, 0, 0) },
            ],
        },
    });
    if (rules.length === 0) return [];

    // day bounds in UTC (IST midnight to next IST midnight)
    const dayStart = istToUtc(y, mo, d, 0, 0).getTime();
    const dayEnd = dayStart + 24 * 3_600_000;
    const taken = await prisma.booking.findMany({
        where: {
            teacherId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            date: { gte: new Date(dayStart), lt: new Date(dayEnd) },
        },
        select: { date: true },
    });
    const takenMins = new Set(taken.map((b) => Math.round((b.date.getTime() - dayStart) / 60_000)));

    const now = Date.now();
    const out: string[] = [];
    for (const r of rules) {
        const from = hm(r.startTime), to = hm(r.endTime);
        if (Number.isNaN(from) || Number.isNaN(to)) continue;
        for (let t = from; t + r.slotMinutes <= to; t += r.slotMinutes) {
            if (takenMins.has(t)) continue;
            if (istToUtc(y, mo, d, Math.floor(t / 60), t % 60).getTime() < now) continue;
            out.push(`${fmtHM(t)} - ${fmtHM(t + r.slotMinutes)}`);
        }
    }
    return [...new Set(out)].sort();
}

interface CancelResult {
    ok: boolean;
    status: number;
    error?: string;
    creditsRestored?: number;
}

/**
 * Cancel a booking. Restores the therapy credit when the rules allow:
 *  - staff/teacher cancel: always refund
 *  - member cancel >= 24h before start: refund
 *  - member cancel < 24h before start: no refund
 * Idempotent: a booking already CANCELLED/COMPLETED/NO_SHOW is left as-is.
 */
export async function cancelBooking(
    bookingId: string,
    opts: { actorUserId: string; byStaff: boolean },
): Promise<CancelResult> {
    return prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({ where: { id: bookingId } });
        if (!booking) return { ok: false, status: 404, error: 'Booking not found' };

        if (!opts.byStaff && booking.userId !== opts.actorUserId) {
            return { ok: false, status: 403, error: 'Not your booking' };
        }
        if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
            return { ok: false, status: 409, error: `Booking is already ${booking.status.toLowerCase()}.` };
        }

        const isTherapy = booking.type === 'THERAPY_SESSION';
        const hoursOut = (booking.date.getTime() - Date.now()) / 3_600_000;
        const refund = isTherapy && (opts.byStaff || hoursOut >= 24);

        await tx.booking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' },
        });

        let creditsRestored = 0;
        if (refund) {
            const u = await tx.user.update({
                where: { id: booking.userId },
                data: { credits: { increment: 1 } },
                select: { credits: true },
            });
            creditsRestored = 1;
            void u;
        }

        recordEvent('BOOKING_CANCELLED', {
            userId: booking.userId,
            metadata: { byStaff: opts.byStaff, refunded: refund },
        });

        return { ok: true, status: 200, creditsRestored };
    });
}
