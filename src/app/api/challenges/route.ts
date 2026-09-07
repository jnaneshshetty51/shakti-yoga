import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { computeProgress, serializeChallenge } from '@/lib/challenges';

export const dynamic = 'force-dynamic';

/** GET /api/challenges — published challenges that haven't ended, plus the
 *  caller's join state and progress. */
export async function GET() {
    const session = await getSession();

    try {
        const now = new Date();
        const rows = await prisma.challenge.findMany({
            where: { status: 'PUBLISHED', endDate: { gte: new Date(now.getTime() - 7 * 86_400_000) } },
            orderBy: { endDate: 'asc' },
            include: { _count: { select: { participants: true } } },
        });

        const mine = session
            ? await prisma.challengeParticipant.findMany({
                  where: { userId: session.id, challengeId: { in: rows.map((r) => r.id) } },
              })
            : [];
        const byChallenge = new Map(mine.map((p) => [p.challengeId, p]));

        const challenges = await Promise.all(
            rows.map(async (c) => {
                const p = byChallenge.get(c.id) ?? null;
                const progress = p && session ? await computeProgress(c, session.id) : 0;
                return serializeChallenge(c, p, progress);
            }),
        );

        return NextResponse.json({ challenges }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('[challenges] failed', error);
        return NextResponse.json({ challenges: [] });
    }
}
