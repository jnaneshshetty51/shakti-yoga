/**
 * The app stores a fixed named offset per user (see the `timezone` field on
 * User, and the TIMEZONES list in the register routes) rather than an IANA
 * zone — so no DST transitions, just a constant UTC offset chosen at signup.
 * This is the single source of truth for those offsets, used anywhere a
 * "calendar day" needs to match the user's own day, not the server's UTC day.
 */
const OFFSET_MINUTES: Record<string, number> = {
    IST: 5 * 60 + 30,
    PST: -8 * 60,
    EST: -5 * 60,
    CST: -6 * 60,
    MST: -7 * 60,
    GMT: 0,
    CET: 1 * 60,
    AEDT: 11 * 60,
    AEST: 10 * 60,
    NZDT: 13 * 60,
};

/** UTC offset in minutes for a stored timezone code; defaults to IST (the app default) for anything unrecognized. */
export function offsetMinutesFor(timezone: string | null | undefined): number {
    return OFFSET_MINUTES[timezone ?? ''] ?? OFFSET_MINUTES.IST;
}

/** "YYYY-MM-DD" for this instant in the given timezone — the day-bucketing key for streaks, "today", etc. */
export function localDayKey(date: Date, timezone: string | null | undefined): string {
    const shifted = new Date(date.getTime() + offsetMinutesFor(timezone) * 60_000);
    return shifted.toISOString().slice(0, 10);
}
