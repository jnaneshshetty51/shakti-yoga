import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serializeCommunityPost } from '@/lib/community';

export const dynamic = 'force-dynamic';

/** GET /api/community/posts/:id — one post (for the detail screen). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const post = await prisma.communityPost.findFirst({
        where: { id, hidden: false },
        select: {
            id: true, body: true, imageUrl: true, likeCount: true, commentCount: true,
            createdAt: true, userId: true,
            user: { select: { name: true, avatarUrl: true } },
        },
    });
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let liked = false;
    if (session) {
        liked = !!(await prisma.communityInteraction.findFirst({
            where: { userId: session.id, postId: id },
            select: { id: true },
        }));
    }
    return NextResponse.json(
        { post: serializeCommunityPost(post, session?.id ?? null, liked) },
        { headers: { 'Cache-Control': 'no-store' } },
    );
}

/** DELETE /api/community/posts/:id — author or admin. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const post = await prisma.communityPost.findUnique({ where: { id }, select: { userId: true } });
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (post.userId !== session.id && session.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.communityPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
