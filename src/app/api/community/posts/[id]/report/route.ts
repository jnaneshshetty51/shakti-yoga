import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { POST_HIDE_THRESHOLD } from '@/lib/community';

export const dynamic = 'force-dynamic';

/** POST /api/community/posts/:id/report */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const post = await prisma.communityPost.findUnique({
        where: { id },
        select: { hidden: true, reportCount: true },
    });
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const reason = String((await request.json().catch(() => ({}))).reason ?? '').trim().slice(0, 300) || null;

    // One report per user per post — best effort (no unique on report table for posts).
    const existing = await prisma.communityReport.findFirst({
        where: { postId: id, userId: session.id },
        select: { id: true },
    });
    if (existing) return NextResponse.json({ ok: true, already: true });

    await prisma.communityReport.create({ data: { postId: id, userId: session.id, reason } });
    const shouldHide = !post.hidden && post.reportCount + 1 >= POST_HIDE_THRESHOLD;
    await prisma.communityPost.update({
        where: { id },
        data: { reportCount: { increment: 1 }, ...(shouldHide ? { hidden: true } : {}) },
    });

    return NextResponse.json({ ok: true, hidden: shouldHide });
}
