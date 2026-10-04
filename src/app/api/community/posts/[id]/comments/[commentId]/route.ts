import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** DELETE — author or admin removes a community comment. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; commentId: string }> }) {
    const { id, commentId } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const comment = await prisma.communityComment.findUnique({
        where: { id: commentId },
        select: { userId: true, postId: true, hidden: true },
    });
    if (!comment || comment.postId !== id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (comment.userId !== session.id && session.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Deleting a parent comment cascades to its replies (schema onDelete: Cascade) —
    // commentCount must drop by the whole removed subtree, not just this one row.
    const visibleReplyCount = await prisma.communityComment.count({
        where: { parentId: commentId, hidden: false },
    });
    const totalRemoved = (comment.hidden ? 0 : 1) + visibleReplyCount;

    await prisma.$transaction([
        prisma.communityComment.delete({ where: { id: commentId } }),
        ...(totalRemoved > 0
            ? [prisma.communityPost.update({ where: { id }, data: { commentCount: { decrement: totalRemoved } } })]
            : []),
    ]);
    return NextResponse.json({ ok: true });
}
