import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { checkAchievements } from '@/lib/achievements';
import { updateChallengeProgress } from '@/lib/challenges';
import { PRACTICE_TYPES } from '@/lib/practice';

export const dynamic = 'force-dynamic';

/** POST /api/practices/:id/complete — log a completion. A trusted backend
 *  event, not a client "I watched it" claim: it only fires after this route
 *  itself confirms the practice is published, so the gamification pipeline
 *  downstream (challenges, badges) can trust it. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const practice = await prisma.content.findFirst({
        where: { id, status: 'PUBLISHED', type: { in: PRACTICE_TYPES } },
        select: { id: true, durationMin: true },
    });
    if (!practice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // One completion per practice per ~half-day — a double-tap shouldn't inflate totals.
    const since = new Date(Date.now() - 12 * 3600_000);
    const recent = await prisma.contentCompletion.findFirst({
        where: { userId: session.id, contentId: practice.id, completedAt: { gte: since } },
        select: { id: true },
    });
    if (!recent) {
        await prisma.contentCompletion.create({
            data: { userId: session.id, contentId: practice.id, minutes: practice.durationMin ?? 5 },
        });
        await prisma.content.update({ where: { id: practice.id }, data: { completionCount: { increment: 1 } } }).catch(() => {});
    }

    await updateChallengeProgress(session.id).catch(() => {});
    const earned = await checkAchievements(session.id).catch(() => []);
    return NextResponse.json({ ok: true, earned });
}
