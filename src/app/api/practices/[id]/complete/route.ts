import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { checkAchievements } from '@/lib/achievements';
import { updateChallengeProgress } from '@/lib/challenges';

export const dynamic = 'force-dynamic';

/** POST /api/practices/:id/complete — log a completion (idempotent-ish: allows
 *  repeat completions, which is fine — people redo practices). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const practice = await prisma.practice.findFirst({
        where: { id, status: 'PUBLISHED' },
        select: { id: true, durationMin: true },
    });
    if (!practice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // One completion per practice per day — a double-tap shouldn't inflate totals.
    const since = new Date(Date.now() - 12 * 3600_000);
    const recent = await prisma.practiceCompletion.findFirst({
        where: { userId: session.id, practiceId: practice.id, completedAt: { gte: since } },
        select: { id: true },
    });
    if (!recent) {
        await prisma.practiceCompletion.create({
            data: { userId: session.id, practiceId: practice.id, minutes: practice.durationMin },
        });
    }

    await updateChallengeProgress(session.id).catch(() => {});
    const earned = await checkAchievements(session.id).catch(() => []);
    return NextResponse.json({ ok: true, earned });
}
