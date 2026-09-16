import { prisma } from '@/lib/prisma';
import { localDayKey } from '@/lib/timezone';

const DAY = 86_400_000;

export interface PracticeConsistency {
    /** Consecutive days (through today or yesterday) with >=1 completed practice. */
    streakDays: number;
    /** Completions in the last 30 days. */
    thisCycle: number;
    /** All-time completions. */
    total: number;
}

/**
 * Self-practice consistency for the Home screen's "Your Practice" card —
 * deliberately not points/badges, just a plain streak + counts. Backed by
 * ContentCompletion, a trusted backend event (see src/app/api/practices/[id]/complete),
 * never a client "I did it" claim. Throws on a DB error — callers decide the fallback.
 */
export async function getPracticeConsistency(userId: string): Promise<PracticeConsistency> {
    const since = new Date(Date.now() - 90 * DAY);
    const [user, recent, total] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
        prisma.contentCompletion.findMany({
            where: { userId, completedAt: { gte: since } },
            select: { completedAt: true },
        }),
        prisma.contentCompletion.count({ where: { userId } }),
    ]);

    // Bucket by the user's own calendar day, not the server's UTC day — a
    // practice done between midnight and 5:30am IST otherwise lands on
    // "yesterday" in UTC and silently drops out of "did they practice today".
    const dayKey = (d: Date) => localDayKey(d, user?.timezone);
    const days = new Set(recent.map((r) => dayKey(r.completedAt)));

    let streakDays = 0;
    const cursor = new Date();
    if (!days.has(dayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (days.has(dayKey(cursor))) {
        streakDays += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    const cycleSince = new Date(Date.now() - 30 * DAY);
    const thisCycle = recent.filter((r) => r.completedAt >= cycleSince).length;

    return { streakDays, thisCycle, total };
}
