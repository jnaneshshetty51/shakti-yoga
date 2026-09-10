import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
    serializeContent,
    serializeBlog,
    feedSortValue,
    toContentCategory,
    type FeedItem,
} from '@/lib/content';
import { audienceWhere } from '@/lib/content-audience';
import type { ContentCategory, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const PAGE = 20;
const MAX = 60;

/**
 * Merged content stream for the member app: published Content (reels / posts /
 * announcements) + published BlogPost, pinned first then newest. Offset cursor.
 *
 *   GET /api/content/feed?cursor=0&type=all&category=BREATHING
 *   type: all | reel | post | announcement | blog
 */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const cursor = Math.max(0, Math.trunc(Number(url.searchParams.get('cursor')) || 0));
    const limit = Math.min(MAX, Math.max(1, Math.trunc(Number(url.searchParams.get('limit')) || PAGE)));
    const typeParam = (url.searchParams.get('type') || 'all').toLowerCase();
    const categoryParam = url.searchParams.get('category');
    const category: ContentCategory | null = categoryParam ? toContentCategory(categoryParam) : null;

    const wantContent = ['all', 'reel', 'post', 'announcement'].includes(typeParam);
    const wantBlog = typeParam === 'all' || typeParam === 'blog';

    const session = await getSession();

    // Pull a generous window from each source, merge, then slice the page.
    const window = cursor + limit + 1;

    const contentWhere: Prisma.ContentWhereInput = {
        status: 'PUBLISHED',
        ...(await audienceWhere(session?.id ?? null)),
    };
    if (category) contentWhere.category = category;
    if (typeParam === 'reel') contentWhere.type = 'REEL';
    else if (typeParam === 'post') contentWhere.type = 'POST';
    else if (typeParam === 'announcement') contentWhere.type = 'ANNOUNCEMENT';

    try {
        const [contentRows, blogRows] = await Promise.all([
            wantContent
                ? prisma.content.findMany({
                      where: contentWhere,
                      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
                      take: window,
                  })
                : Promise.resolve([]),
            wantBlog && !category
                ? prisma.blogPost.findMany({
                      where: { status: 'PUBLISHED' },
                      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
                      take: window,
                  })
                : Promise.resolve([]),
        ]);

        // Which of these did the caller like / save?
        let liked = new Set<string>();
        let saved = new Set<string>();
        if (session && contentRows.length) {
            const ix = await prisma.contentInteraction.findMany({
                where: { userId: session.id, contentId: { in: contentRows.map((r) => r.id) } },
                select: { contentId: true, kind: true },
            });
            liked = new Set(ix.filter((i) => i.kind === 'like').map((i) => i.contentId));
            saved = new Set(ix.filter((i) => i.kind === 'save').map((i) => i.contentId));
        }

        const items: FeedItem[] = [
            ...contentRows.map((r) =>
                serializeContent(r, { liked: liked.has(r.id), saved: saved.has(r.id) }),
            ),
            ...blogRows.map((b) => serializeBlog(b)),
        ].sort((a, b) => feedSortValue(b) - feedSortValue(a));

        const page = items.slice(cursor, cursor + limit);
        const nextCursor = items.length > cursor + limit ? cursor + limit : null;

        return NextResponse.json(
            { items: page, nextCursor },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        console.error('[content/feed] failed', error);
        return NextResponse.json({ items: [], nextCursor: null });
    }
}
