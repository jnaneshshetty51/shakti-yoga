import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { serializeCommunityComment, MAX_COMMENT_LEN } from '@/lib/community';

export const dynamic = 'force-dynamic';
const PAGE = 20;

const SELECT = {
    id: true, body: true, createdAt: true, userId: true,
    user: { select: { name: true, avatarUrl: true } },
} as const;

/** GET /api/community/posts/:id/comments?cursor=0 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const cursor = Math.max(0, Math.trunc(Number(new URL(request.url).searchParams.get('cursor')) || 0));
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await prisma.communityComment.findMany({
        where: { postId: id, hidden: false },
        orderBy: { createdAt: 'asc' },
        skip: cursor,
        take: PAGE + 1,
        select: SELECT,
    });
    const hasMore = rows.length > PAGE;
    return NextResponse.json({
        comments: rows.slice(0, PAGE).map((r) => serializeCommunityComment(r, session?.id ?? null)),
        nextCursor: hasMore ? cursor + PAGE : null,
    });
}

/** POST /api/community/posts/:id/comments */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { allowed } = rateLimit(`community-comment:${session.id}`, 15, 5 * 60 * 1000);
    if (!allowed) return NextResponse.json({ error: 'Slow down a moment.' }, { status: 429 });

    const body = String((await request.json().catch(() => ({}))).body ?? '').trim().slice(0, MAX_COMMENT_LEN);
    if (body.length < 1) return NextResponse.json({ error: 'Write something first.' }, { status: 400 });

    const post = await prisma.communityPost.findUnique({ where: { id }, select: { hidden: true } });
    if (!post || post.hidden) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [comment] = await prisma.$transaction([
        prisma.communityComment.create({ data: { postId: id, userId: session.id, body }, select: SELECT }),
        prisma.communityPost.update({ where: { id }, data: { commentCount: { increment: 1 } } }),
    ]);

    return NextResponse.json({ comment: serializeCommunityComment(comment, session.id) }, { status: 201 });
}
