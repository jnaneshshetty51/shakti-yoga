import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { ALLOWED_REACTIONS, getReactionSummary } from '@/lib/community';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const post = await prisma.communityPost.findUnique({ where: { id }, select: { id: true } });
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const requestedReaction = typeof body.reaction === 'string' && body.reaction.trim() ? body.reaction.trim() : '❤️';
    if (!(ALLOWED_REACTIONS as readonly string[]).includes(requestedReaction)) {
        return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 });
    }

    // Interactive transaction: the interaction row and the denormalized likeCount must
    // move together, and a create/create race (double-tap) must converge instead of 500ing.
    await prisma.$transaction(async (tx) => {
        const existing = await tx.communityInteraction.findUnique({
            where: { userId_postId: { userId: session.id, postId: id } },
        });

        if (existing) {
            if (existing.reaction === requestedReaction) {
                const removed = await tx.communityInteraction.deleteMany({
                    where: { userId: session.id, postId: id },
                });
                if (removed.count > 0) {
                    await tx.communityPost.update({ where: { id }, data: { likeCount: { decrement: 1 } } });
                }
            } else {
                await tx.communityInteraction.updateMany({
                    where: { userId: session.id, postId: id },
                    data: { reaction: requestedReaction },
                });
            }
            return;
        }

        try {
            await tx.communityInteraction.create({
                data: { userId: session.id, postId: id, reaction: requestedReaction },
            });
            await tx.communityPost.update({ where: { id }, data: { likeCount: { increment: 1 } } });
        } catch (err) {
            // Lost a create/create race to a concurrent request for the same user+post —
            // converge on their row instead of throwing an unhandled unique-constraint error.
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                await tx.communityInteraction.updateMany({
                    where: { userId: session.id, postId: id },
                    data: { reaction: requestedReaction },
                });
            } else {
                throw err;
            }
        }
    });

    const [p, summary] = await Promise.all([
        prisma.communityPost.findUnique({ where: { id }, select: { likeCount: true } }),
        getReactionSummary(id, session.id),
    ]);

    return NextResponse.json({
        on: Boolean(summary.myReaction),
        reaction: summary.myReaction,
        likeCount: p?.likeCount ?? 0,
        reactionCounts: summary.reactionCounts,
    });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.$transaction(async (tx) => {
        const removed = await tx.communityInteraction.deleteMany({ where: { userId: session.id, postId: id } });
        if (removed.count > 0) {
            await tx.communityPost.update({ where: { id }, data: { likeCount: { decrement: 1 } } });
        }
    });

    const [p, summary] = await Promise.all([
        prisma.communityPost.findUnique({ where: { id }, select: { likeCount: true } }),
        getReactionSummary(id, null),
    ]);

    return NextResponse.json({
        on: false,
        reaction: null,
        likeCount: p?.likeCount ?? 0,
        reactionCounts: summary.reactionCounts,
    });
}
