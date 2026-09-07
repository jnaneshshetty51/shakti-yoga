import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { COMMENT_HIDE_THRESHOLD } from '@/lib/community';

export const dynamic = 'force-dynamic';

/** POST — report a community comment. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string; commentId: string }> }) {
    const { id, commentId } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const comment = await prisma.communityComment.findUnique({
        where: { id: commentId },
        select: { postId: true, hidden: true, reportCount: true },
    });
    if (!comment || comment.postId !== id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const reason = String((await request.json().catch(() => ({}))).reason ?? '').trim().slice(0, 300) || null;
    const existing = await prisma.communityReport.findFirst({
        where: { commentId, userId: session.id },
        select: { id: true },
    });
    if (existing) return NextResponse.json({ ok: true, already: true });

    await prisma.communityReport.create({ data: { commentId, userId: session.id, reason } });
    const shouldHide = !comment.hidden && comment.reportCount + 1 >= COMMENT_HIDE_THRESHOLD;
    await prisma.$transaction([
        prisma.communityComment.update({
            where: { id: commentId },
            data: { reportCount: { increment: 1 }, ...(shouldHide ? { hidden: true } : {}) },
        }),
        ...(shouldHide
            ? [prisma.communityPost.update({ where: { id }, data: { commentCount: { decrement: 1 } } })]
            : []),
    ]);
    return NextResponse.json({ ok: true, hidden: shouldHide });
}
