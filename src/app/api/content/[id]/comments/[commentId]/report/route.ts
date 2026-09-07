import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Auto-hide a comment once this many distinct members report it. */
const HIDE_THRESHOLD = 3;

/** POST /api/content/:id/comments/:commentId/report */
export async function POST(request: Request, ctx: { params: Promise<{ id: string; commentId: string }> }) {
    const { id, commentId } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const comment = await prisma.contentComment.findUnique({
        where: { id: commentId },
        select: { id: true, contentId: true, hidden: true, reportCount: true },
    });
    if (!comment || comment.contentId !== id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const reason = String((await request.json().catch(() => ({}))).reason ?? '').trim().slice(0, 300) || null;

    try {
        await prisma.commentReport.create({ data: { commentId, userId: session.id, reason } });
    } catch {
        return NextResponse.json({ ok: true, already: true }); // unique -> already reported
    }

    const nextCount = comment.reportCount + 1;
    const shouldHide = !comment.hidden && nextCount >= HIDE_THRESHOLD;
    await prisma.$transaction([
        prisma.contentComment.update({
            where: { id: commentId },
            data: { reportCount: { increment: 1 }, ...(shouldHide ? { hidden: true } : {}) },
        }),
        ...(shouldHide
            ? [prisma.content.update({ where: { id }, data: { commentCount: { decrement: 1 } } })]
            : []),
    ]);

    return NextResponse.json({ ok: true, hidden: shouldHide });
}
