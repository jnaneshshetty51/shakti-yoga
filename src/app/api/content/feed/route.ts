import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serializeContent, feedSortValue, toContentCategory, type FeedItem } from '@/lib/content';
import { audienceWhere } from '@/lib/content-audience';
import { publishScheduledContent } from '@/lib/content-schedule';
import type { ContentCategory, ContentType, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const PAGE = 20;
const MAX = 60;

const TYPE_BY_KIND: Record<string, ContentType> = {
    video: 'VIDEO',
    audio: 'AUDIO',
    article: 'ARTICLE',
    founder_message: 'FOUNDER_MESSAGE',
    announcement: 'ANNOUNCEMENT',
};

/**
 * The mixed content stream for the member app — everything except the two
 * practice types (Short Practice / Take a Moment have their own dedicated
 * /api/practices surface). Pinned first, then newest. Offset cursor.
 *
 *   GET /api/content/feed?cursor=0&type=all&category=BREATHING
 *   type: all | video | audio | article | founder_message | announcement
 */
export async function GET(request: Request) {
    // Safety net for the scheduled-publish cron possibly not being installed
    // (see CONTENT_PLATFORM_PLAN.md) — fire-and-forget so a rare due item never
    // adds push-notification latency to a feed load; it'll appear on the very
    // next request either way.
    void publishScheduledContent().catch(() => {});

    const url = new URL(request.url);
    const cursor = Math.max(0, Math.trunc(Number(url.searchParams.get('cursor')) || 0));
    const limit = Math.min(MAX, Math.max(1, Math.trunc(Number(url.searchParams.get('limit')) || PAGE)));
    const typeParam = (url.searchParams.get('type') || 'all').toLowerCase();
    const categoryParam = url.searchParams.get('category');
    const category: ContentCategory | null = categoryParam ? toContentCategory(categoryParam) : null;

    const session = await getSession();
    const window = cursor + limit + 1;

    const contentWhere: Prisma.ContentWhereInput = {
        status: 'PUBLISHED',
        type: typeParam !== 'all' && typeParam in TYPE_BY_KIND ? TYPE_BY_KIND[typeParam] : { in: Object.values(TYPE_BY_KIND) },
        ...(await audienceWhere(session?.id ?? null)),
    };
    if (category) contentWhere.category = category;

    try {
        const rows = await prisma.content.findMany({
            where: contentWhere,
            orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
            take: window,
        });

        let liked = new Set<string>();
        let saved = new Set<string>();
        if (session && rows.length) {
            const ix = await prisma.contentInteraction.findMany({
                where: { userId: session.id, contentId: { in: rows.map((r) => r.id) } },
                select: { contentId: true, kind: true },
            });
            liked = new Set(ix.filter((i) => i.kind === 'like').map((i) => i.contentId));
            saved = new Set(ix.filter((i) => i.kind === 'save').map((i) => i.contentId));
        }

        const items: FeedItem[] = rows
            .map((r) => serializeContent(r, { liked: liked.has(r.id), saved: saved.has(r.id) }))
            .sort((a, b) => feedSortValue(b) - feedSortValue(a));

        const page = items.slice(cursor, cursor + limit);
        const nextCursor = items.length > cursor + limit ? cursor + limit : null;

        return NextResponse.json({ items: page, nextCursor }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('[content/feed] failed', error);
        return NextResponse.json({ items: [], nextCursor: null });
    }
}
