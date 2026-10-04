import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serializeCommunityPost, getReactionSummaries } from '@/lib/community';

export const dynamic = 'force-dynamic';
const PAGE = 20;

/** GET /api/community/feed?cursor=0&mine=true — visible member posts, newest first. */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const cursor = Math.max(0, Math.trunc(Number(url.searchParams.get('cursor')) || 0));
    const mineOnly = url.searchParams.get('mine') === 'true';
    const authorId = url.searchParams.get('userId');
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const whereClause: { hidden: boolean; userId?: string } = { hidden: false };
        if (mineOnly) {
            whereClause.userId = session.id;
        } else if (authorId) {
            whereClause.userId = authorId;
        }

        const rows = await prisma.communityPost.findMany({
            where: whereClause,
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

        const summaries = await getReactionSummaries(page.map((p) => p.id), session.id);
        const posts = page.map((p) => {
            const summary = summaries.get(p.id)!;
            return serializeCommunityPost(p, session.id, summary.myReaction, summary.reactionCounts);
        });

        return NextResponse.json(
            {
                posts,
                nextCursor: hasMore ? cursor + PAGE : null,
            },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        console.error('[community/feed] failed', error);
        return NextResponse.json({ posts: [], nextCursor: null });
    }
}
