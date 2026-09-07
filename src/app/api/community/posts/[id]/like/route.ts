import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const post = await prisma.communityPost.findUnique({ where: { id }, select: { id: true } });
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    try {
        await prisma.communityInteraction.create({ data: { userId: session.id, postId: id } });
        const p = await prisma.communityPost.update({
            where: { id },
            data: { likeCount: { increment: 1 } },
            select: { likeCount: true },
        });
        return NextResponse.json({ on: true, likeCount: p.likeCount });
    } catch {
        const p = await prisma.communityPost.findUnique({ where: { id }, select: { likeCount: true } });
        return NextResponse.json({ on: true, likeCount: p?.likeCount ?? 0 });
    }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const removed = await prisma.communityInteraction.deleteMany({ where: { userId: session.id, postId: id } });
    if (removed.count > 0) {
        await prisma.communityPost.update({ where: { id }, data: { likeCount: { decrement: 1 } } }).catch(() => {});
    }
    const p = await prisma.communityPost.findUnique({ where: { id }, select: { likeCount: true } });
    return NextResponse.json({ on: false, likeCount: p?.likeCount ?? 0 });
}
