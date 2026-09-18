/**
 * IST (Asia/Kolkata, fixed +05:30, no DST) calendar-date helpers — mirrors
 * src/lib/class-schedule.ts's istParts()/istToUtc() on the backend by hand
 * rather than relying on Intl timeZone support, so mobile never disagrees
 * with the server (which stores every therapy slot/booking date as an IST
 * calendar day) about what day "today" or a picked date actually is.
 */

const IST_OFFSET_MIN = 5 * 60 + 30;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function istParts(d: Date) {
  const shifted = new Date(d.getTime() + IST_OFFSET_MIN * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month1: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: DAY_NAMES[shifted.getUTCDay()],
  };
}

/** "YYYY-MM-DD" IST calendar date — the exact format /api/therapy/slots and /api/bookings expect. */
export function istYmd(d: Date): string {
  const { year, month1, day } = istParts(d);
  return `${year}-${String(month1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
