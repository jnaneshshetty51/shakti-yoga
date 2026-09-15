import { prisma } from '@/lib/prisma';
import { serializeContent, type FeedItem } from '@/lib/content';
import { audienceWhere } from '@/lib/content-audience';
import type { ContentCategory } from '@prisma/client';

export interface HomeContent {
    featured: FeedItem | null;
    founderMessage: FeedItem | null;
    announcement: FeedItem | null;
    forYou: FeedItem[];
    recommended: { category: ContentCategory; items: FeedItem[] } | null;
}

const EMPTY: HomeContent = { featured: null, founderMessage: null, announcement: null, forYou: [], recommended: null };

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
 * Curated bundle for the Home screen — admin-controlled "Featured" content
 * (falling back to the newest pinned video), the latest founder message, a
 * pinned announcement, a couple of "for you" items, and (once the member has
 * engaged with a few items) a "more like this" rail keyed on their top
 * category. Never throws — degrades to an empty bundle.
 */
export async function getHomeContent(userId: string | null): Promise<HomeContent> {
    try {
        const aud = await audienceWhere(userId);

        const featured =
            (await prisma.content.findFirst({
                where: { status: 'PUBLISHED', featured: true, ...aud },
                orderBy: [{ publishedAt: 'desc' }],
            })) ??
            (await prisma.content.findFirst({
                where: { status: 'PUBLISHED', type: 'VIDEO', pinned: true, ...aud },
                orderBy: [{ publishedAt: 'desc' }],
            }));

        const [article, founderMessage, announcement] = await Promise.all([
            prisma.content.findFirst({
                where: { status: 'PUBLISHED', type: 'ARTICLE', ...aud },
                orderBy: [{ publishedAt: 'desc' }],
            }),
            prisma.content.findFirst({
                where: { status: 'PUBLISHED', type: 'FOUNDER_MESSAGE', ...aud },
                orderBy: [{ publishedAt: 'desc' }],
            }),
            prisma.content.findFirst({
                where: { status: 'PUBLISHED', type: 'ANNOUNCEMENT', pinned: true, ...aud },
                orderBy: [{ important: 'desc' }, { publishedAt: 'desc' }],
            }),
        ]);

        const highlighted = [featured, article, founderMessage, announcement].filter(Boolean).map((r) => r!.id);
        let liked = new Set<string>();
        let saved = new Set<string>();
        if (userId && highlighted.length) {
            const ix = await prisma.contentInteraction.findMany({
                where: { userId, contentId: { in: highlighted } },
                select: { contentId: true, kind: true },
            });
            liked = new Set(ix.filter((i) => i.kind === 'like').map((i) => i.contentId));
            saved = new Set(ix.filter((i) => i.kind === 'save').map((i) => i.contentId));
        }
        const ser = (r: NonNullable<typeof featured>) =>
            serializeContent(r, { liked: liked.has(r.id), saved: saved.has(r.id) });

        const forYou: FeedItem[] = [];
        if (article && article.id !== featured?.id) forYou.push(ser(article));

        // "Because you saved …" rail.
        let recommended: { category: ContentCategory; items: FeedItem[] } | null = null;
        if (userId) {
            const cat = await affinityCategory(userId);
            if (cat) {
                const exclude = highlighted;
                const rows = await prisma.content.findMany({
                    where: { status: 'PUBLISHED', category: cat, id: { notIn: exclude }, ...aud },
                    orderBy: [{ publishedAt: 'desc' }],
                    take: 4,
                });
                if (rows.length) {
                    const ixR = await prisma.contentInteraction.findMany({
                        where: { userId, contentId: { in: rows.map((r) => r.id) } },
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

        return {
            featured: featured ? ser(featured) : null,
            founderMessage: founderMessage ? ser(founderMessage) : null,
            announcement: announcement ? ser(announcement) : null,
            forYou,
            recommended,
        };
    } catch (error) {
        console.error('[content/home] failed', error);
        return EMPTY;
    }
}
