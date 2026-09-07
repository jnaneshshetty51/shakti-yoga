import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serializeContent, serializeBlog, type FeedItem } from '@/lib/content';
import type { ContentCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * The member's most-engaged content category, from their likes + saves.
 * Returns null if they haven't interacted enough to guess.
 */
async function affinityCategory(userId: string): Promise<ContentCategory | null> {
    const rows = await prisma.contentInteraction.findMany({
        where: { userId },
        select: { content: { select: { category: true } } },
        take: 200,
    });
    if (rows.length < 2) return null;
    const tally = new Map<ContentCategory, number>();
    for (const r of rows) {
        const cat = r.content.category;
        tally.set(cat, (tally.get(cat) ?? 0) + 1);
    }
    const [top] = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    return top && top[1] >= 2 ? top[0] : null;
}

/**
 * Curated bundle for the app Home screen — one featured reel, a recommended
 * article, the latest post, a pinned announcement, and (once the member has
 * engaged with a few items) a "more like this" rail keyed on their top category.
 */
export async function GET() {
    const session = await getSession();

    try {
        const [reel, post, announcement, blog] = await Promise.all([
            prisma.content.findFirst({
                where: { status: 'PUBLISHED', type: 'REEL' },
                orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
            }),
            prisma.content.findFirst({
                where: { status: 'PUBLISHED', type: 'POST' },
                orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
            }),
            prisma.content.findFirst({
                where: { status: 'PUBLISHED', type: 'ANNOUNCEMENT', pinned: true },
                orderBy: { publishedAt: 'desc' },
            }),
            prisma.blogPost.findFirst({
                where: { status: 'PUBLISHED' },
                orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
            }),
        ]);

        const contentIds = [reel, post, announcement].filter(Boolean).map((r) => r!.id);
        let liked = new Set<string>();
        let saved = new Set<string>();
        if (session && contentIds.length) {
            const ix = await prisma.contentInteraction.findMany({
                where: { userId: session.id, contentId: { in: contentIds } },
                select: { contentId: true, kind: true },
            });
            liked = new Set(ix.filter((i) => i.kind === 'like').map((i) => i.contentId));
            saved = new Set(ix.filter((i) => i.kind === 'save').map((i) => i.contentId));
        }
        const ser = (r: NonNullable<typeof reel>) =>
            serializeContent(r, { liked: liked.has(r.id), saved: saved.has(r.id) });

        const forYou: FeedItem[] = [];
        if (post) forYou.push(ser(post));
        if (blog) forYou.push(serializeBlog(blog));

        // "Because you saved …" rail.
        let recommended: { category: ContentCategory; items: FeedItem[] } | null = null;
        if (session) {
            const cat = await affinityCategory(session.id);
            if (cat) {
                const exclude = [reel, post, announcement].filter(Boolean).map((r) => r!.id);
                const rows = await prisma.content.findMany({
                    where: { status: 'PUBLISHED', category: cat, id: { notIn: exclude } },
                    orderBy: [{ publishedAt: 'desc' }],
                    take: 4,
                });
                if (rows.length) {
                    const ixR = await prisma.contentInteraction.findMany({
                        where: { userId: session.id, contentId: { in: rows.map((r) => r.id) } },
                        select: { contentId: true, kind: true },
                    });
                    const likedR = new Set(ixR.filter((i) => i.kind === 'like').map((i) => i.contentId));
                    const savedR = new Set(ixR.filter((i) => i.kind === 'save').map((i) => i.contentId));
                    recommended = {
                        category: cat,
                        items: rows.map((r) => serializeContent(r, { liked: likedR.has(r.id), saved: savedR.has(r.id) })),
                    };
                }
            }
        }

        return NextResponse.json(
            {
                featuredReel: reel ? ser(reel) : null,
                announcement: announcement ? ser(announcement) : null,
                forYou,
                recommended,
            },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        console.error('[content/home] failed', error);
        return NextResponse.json({ featuredReel: null, announcement: null, forYou: [], recommended: null });
    }
}
