import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** DELETE /api/content/:id/comments/:commentId — author or admin removes a comment. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; commentId: string }> }) {
    const { id, commentId } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const comment = await prisma.contentComment.findUnique({
        where: { id: commentId },
        select: { id: true, userId: true, hidden: true, contentId: true },
    });
    if (!comment || comment.contentId !== id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (comment.userId !== session.id && session.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.$transaction([
        prisma.contentComment.delete({ where: { id: commentId } }),
        ...(comment.hidden
            ? []
            : [prisma.content.update({ where: { id }, data: { commentCount: { decrement: 1 } } })]),
    ]);

    return NextResponse.json({ ok: true });
}
