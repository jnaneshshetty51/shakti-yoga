import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { ACHIEVEMENTS } from '@/lib/achievements';

export const dynamic = 'force-dynamic';

/** GET /api/me/achievements — the full badge catalogue with earned dates. */
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const earned = await prisma.userAchievement.findMany({
        where: { userId: session.id },
        select: { key: true, earnedAt: true },
    });
    const map = new Map(earned.map((e) => [e.key, e.earnedAt.toISOString()]));

    return NextResponse.json(
        {
            achievements: ACHIEVEMENTS.map((a) => ({
                ...a,
                earnedAt: map.get(a.key) ?? null,
            })),
            earnedCount: earned.length,
            total: ACHIEVEMENTS.length,
        },
        { headers: { 'Cache-Control': 'no-store' } },
    );
}
