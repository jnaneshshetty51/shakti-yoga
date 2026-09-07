import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serializeCommunityPost } from '@/lib/community';

export const dynamic = 'force-dynamic';
const PAGE = 20;

/** GET /api/community/feed?cursor=0 — visible member posts, newest first. */
export async function GET(request: Request) {
    const cursor = Math.max(0, Math.trunc(Number(new URL(request.url).searchParams.get('cursor')) || 0));
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const rows = await prisma.communityPost.findMany({
            where: { hidden: false },
            orderBy: { createdAt: 'desc' },
            skip: cursor,
            take: PAGE + 1,
            select: {
                id: true, body: true, imageUrl: true, likeCount: true, commentCount: true,
                createdAt: true, userId: true,
                user: { select: { name: true, avatarUrl: true } },
            },
        });
        const hasMore = rows.length > PAGE;
        const page = rows.slice(0, PAGE);

        let liked = new Set<string>();
        if (session && page.length) {
            const likes = await prisma.communityInteraction.findMany({
                where: { userId: session.id, postId: { in: page.map((p) => p.id) } },
                select: { postId: true },
            });
            liked = new Set(likes.map((l) => l.postId));
        }

        return NextResponse.json(
            {
                posts: page.map((p) => serializeCommunityPost(p, session?.id ?? null, liked.has(p.id))),
                nextCursor: hasMore ? cursor + PAGE : null,
            },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        console.error('[community/feed] failed', error);
        return NextResponse.json({ posts: [], nextCursor: null });
    }
}
