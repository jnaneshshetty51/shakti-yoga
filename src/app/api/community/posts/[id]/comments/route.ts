import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { serializeCommunityComment, MAX_COMMENT_LEN } from '@/lib/community';

export const dynamic = 'force-dynamic';
const PAGE = 20;

const SELECT = {
    id: true, body: true, createdAt: true, userId: true, parentId: true,
    user: { select: { name: true, avatarUrl: true } },
} as const;

/** GET /api/community/posts/:id/comments?cursor=0 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const cursor = Math.max(0, Math.trunc(Number(new URL(request.url).searchParams.get('cursor')) || 0));
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await prisma.communityComment.findMany({
        where: { postId: id, hidden: false, parentId: null },
        orderBy: { createdAt: 'asc' },
        skip: cursor,
        take: PAGE + 1,
        select: {
            ...SELECT,
            replies: {
                where: { hidden: false },
                orderBy: { createdAt: 'asc' },
                select: SELECT,
            },
        },
    });
    const hasMore = rows.length > PAGE;
    return NextResponse.json({
        comments: rows.slice(0, PAGE).map((r) => serializeCommunityComment(r, session?.id ?? null)),
        nextCursor: hasMore ? cursor + PAGE : null,
    });
}

/** POST /api/community/posts/:id/comments — create comment or nested reply */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { allowed } = await rateLimit(`community-comment:${session.id}`, 20, 5 * 60 * 1000);
    if (!allowed) return NextResponse.json({ error: 'Slow down a moment.' }, { status: 429 });

    const json = await request.json().catch(() => ({}));
    const body = String(json.body ?? '').trim().slice(0, MAX_COMMENT_LEN);
    let parentId = typeof json.parentId === 'string' && json.parentId.trim() ? json.parentId.trim() : null;

    if (body.length < 1) return NextResponse.json({ error: 'Write something first.' }, { status: 400 });

    const post = await prisma.communityPost.findUnique({ where: { id }, select: { hidden: true } });
    if (!post || post.hidden) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (parentId) {
        const parent = await prisma.communityComment.findUnique({
            where: { id: parentId },
            select: { postId: true, hidden: true, parentId: true },
        });
        if (!parent || parent.postId !== id || parent.hidden) {
            return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
        }
        // Comments are flattened to 2 levels (GET only nests one level of replies) —
        // replying to a reply attaches to its top-level parent instead of nesting deeper.
        if (parent.parentId) parentId = parent.parentId;
    }

    const [comment] = await prisma.$transaction([
        prisma.communityComment.create({
            data: { postId: id, userId: session.id, body, parentId },
            select: SELECT,
        }),
        prisma.communityPost.update({ where: { id }, data: { commentCount: { increment: 1 } } }),
    ]);

    return NextResponse.json({ comment: serializeCommunityComment(comment, session.id) }, { status: 201 });
}
