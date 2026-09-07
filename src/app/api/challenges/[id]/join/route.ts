import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { updateChallengeProgress } from '@/lib/challenges';

export const dynamic = 'force-dynamic';

/** POST — join a challenge. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const challenge = await prisma.challenge.findFirst({
        where: { id, status: 'PUBLISHED', endDate: { gte: new Date() } },
        select: { id: true },
    });
    if (!challenge) return NextResponse.json({ error: 'This challenge is not open.' }, { status: 404 });

    await prisma.challengeParticipant.upsert({
        where: { challengeId_userId: { challengeId: id, userId: session.id } },
        create: { challengeId: id, userId: session.id },
        update: {},
    });

    // Joining mid-way? Catch them up immediately.
    await updateChallengeProgress(session.id).catch(() => {});
    return NextResponse.json({ ok: true, joined: true });
}

/** DELETE — leave a challenge. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.challengeParticipant.deleteMany({ where: { challengeId: id, userId: session.id } });
    return NextResponse.json({ ok: true, joined: false });
}
