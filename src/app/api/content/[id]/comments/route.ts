import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { mediaSrc, toStorageKey } from '@/lib/storage';
import { checkAchievements } from '@/lib/achievements';

export const dynamic = 'force-dynamic';

const PAGE = 20;
const MAX_LEN = 1000;

function serialize(
    row: { id: string; body: string; createdAt: Date; userId: string; user: { name: string; avatarUrl: string | null } },
    viewerId: string | null,
) {
    const key = row.user.avatarUrl ? toStorageKey(row.user.avatarUrl) : null;
    return {
        id: row.id,
        body: row.body,
        author: row.user.name,
        avatarUrl: key ? mediaSrc(key) : row.user.avatarUrl,
        createdAt: row.createdAt.toISOString(),
        mine: row.userId === viewerId,
    };
}

/** GET /api/content/:id/comments?cursor=0 — visible comments, newest first. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const cursor = Math.max(0, Math.trunc(Number(new URL(request.url).searchParams.get('cursor')) || 0));
    const session = await getSession();

    try {
        const rows = await prisma.contentComment.findMany({
            where: { contentId: id, hidden: false },
            orderBy: { createdAt: 'desc' },
            skip: cursor,
            take: PAGE + 1,
            select: {
                id: true, body: true, createdAt: true, userId: true,
                user: { select: { name: true, avatarUrl: true } },
            },
        });
        const hasMore = rows.length > PAGE;
        const page = rows.slice(0, PAGE).map((r) => serialize(r, session?.id ?? null));
        return NextResponse.json(
            { comments: page, nextCursor: hasMore ? cursor + PAGE : null },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        console.error('[comments] list failed', error);
        return NextResponse.json({ comments: [], nextCursor: null });
    }
}

/** POST /api/content/:id/comments — add a comment. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { allowed, retryAfterSeconds } = rateLimit(`comment:${session.id}`, 10, 5 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'You are commenting too fast. Try again shortly.' },
            { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
        );
    }

    const body = await request.json().catch(() => ({}));
    const text = String(body.body ?? '').trim().slice(0, MAX_LEN);
    if (text.length < 1) return NextResponse.json({ error: 'Write something first.' }, { status: 400 });

    const content = await prisma.content.findFirst({ where: { id, status: 'PUBLISHED' }, select: { id: true } });
    if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [comment] = await prisma.$transaction([
        prisma.contentComment.create({
            data: { contentId: id, userId: session.id, body: text },
            select: {
                id: true, body: true, createdAt: true, userId: true,
                user: { select: { name: true, avatarUrl: true } },
            },
        }),
        prisma.content.update({ where: { id }, data: { commentCount: { increment: 1 } } }),
    ]);

    void checkAchievements(session.id).catch(() => {});
    return NextResponse.json({ comment: serialize(comment, session.id) }, { status: 201 });
}
