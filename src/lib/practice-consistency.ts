import { prisma } from '@/lib/prisma';

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
    const [recent, total] = await Promise.all([
        prisma.contentCompletion.findMany({
            where: { userId, completedAt: { gte: since } },
            select: { completedAt: true },
        }),
        prisma.contentCompletion.count({ where: { userId } }),
    ]);

    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
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
