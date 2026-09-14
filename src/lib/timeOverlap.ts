/** Parse an "HH:MM" (24h) string to minutes since midnight. */
export function toMinutes(hm: string): number {
    const [h, m] = hm.split(':').map(Number);
    return h * 60 + m;
}

/** Whether [aStart, aEnd) and [bStart, bEnd) (minutes since midnight) overlap. */
export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
    return aStart < bEnd && bStart < aEnd;
}
