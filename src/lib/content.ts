import type { Content, BlogPost, ContentCategory } from '@prisma/client';

/** CTA intents an item can carry. The app resolves these to a destination. */
export const CTA_TYPES = [
    'none',
    'join_next_class',
    'view_classes',
    'book_therapy',
    'open_blog',
    'open_practice',
] as const;
export type CtaType = (typeof CTA_TYPES)[number];

export const CONTENT_CATEGORIES: ContentCategory[] = [
    'YOGA',
    'BREATHING',
    'MINDFULNESS',
    'MOBILITY',
    'SLEEP',
    'STRENGTH',
    'WELLNESS',
    'BEGINNERS',
    'PHILOSOPHY',
    'STUDIO',
    'COMMUNITY',
];

export function isCtaType(v: unknown): v is CtaType {
    return typeof v === 'string' && (CTA_TYPES as readonly string[]).includes(v);
}

export function toContentCategory(v: unknown): ContentCategory {
    const s = String(v || '').toUpperCase();
    return (CONTENT_CATEGORIES as string[]).includes(s) ? (s as ContentCategory) : 'YOGA';
}

export interface Cta {
    type: CtaType;
    label: string | null;
    blogId: string | null;
    practiceId: string | null;
}

export type FeedItem =
    | {
          kind: 'reel';
          id: string;
          title: string;
          caption: string | null;
          category: ContentCategory;
          instagramUrl: string | null;
          imageUrl: string | null;
          author: string;
          tags: string[];
          publishedAt: string | null;
          pinned: boolean;
          important: boolean;
          likeCount: number;
          saveCount: number;
          commentCount: number;
          liked: boolean;
          saved: boolean;
          cta: Cta;
      }
    | {
          kind: 'post' | 'announcement';
          id: string;
          title: string;
          body: string | null;
          category: ContentCategory;
          imageUrl: string | null;
          mediaUrls: string[];
          author: string;
          tags: string[];
          publishedAt: string | null;
          pinned: boolean;
          important: boolean;
          likeCount: number;
          saveCount: number;
          commentCount: number;
          liked: boolean;
          saved: boolean;
          cta: Cta;
      }
    | {
          kind: 'blog';
          id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          category: string;
          imageUrl: string | null;
          author: string;
          publishedAt: string | null;
          readMinutes: number;
          cta: Cta;
          relatedClass: { id: string; name: string } | null;
      };

const cta = (c: {
    ctaType: string | null;
    ctaLabel: string | null;
    relatedBlogId?: string | null;
    relatedPracticeId?: string | null;
}): Cta => ({
    type: isCtaType(c.ctaType) ? c.ctaType : 'none',
    label: c.ctaLabel || null,
    blogId: c.relatedBlogId || null,
    practiceId: c.relatedPracticeId || null,
});

/** Rough read time from a markdown/plain body (~200 wpm, min 1). */
export function readMinutes(body: string): number {
    const words = body.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
}

export function serializeContent(
    row: Content,
    flags: { liked: boolean; saved: boolean } = { liked: false, saved: false },
): FeedItem {
    const publishedAt = row.publishedAt ? row.publishedAt.toISOString() : null;
    if (row.type === 'REEL') {
        return {
            kind: 'reel',
            id: row.id,
            title: row.title,
            caption: row.caption,
            category: row.category,
            instagramUrl: row.instagramUrl,
            imageUrl: row.imageUrl,
            author: row.author,
            tags: row.tags,
            publishedAt,
            pinned: row.pinned,
            important: row.important,
            likeCount: row.likeCount,
            saveCount: row.saveCount,
            commentCount: row.commentCount,
            liked: flags.liked,
            saved: flags.saved,
            cta: cta(row),
        };
    }
    return {
        kind: row.type === 'ANNOUNCEMENT' ? 'announcement' : 'post',
        id: row.id,
        title: row.title,
        body: row.body,
        category: row.category,
        imageUrl: row.imageUrl,
        mediaUrls: row.mediaUrls,
        author: row.author,
        tags: row.tags,
        publishedAt,
        pinned: row.pinned,
        important: row.important,
        likeCount: row.likeCount,
        saveCount: row.saveCount,
        commentCount: row.commentCount,
        liked: flags.liked,
        saved: flags.saved,
        cta: cta(row),
    };
}

export function serializeBlog(
    row: BlogPost,
    relatedClass: { id: string; name: string } | null = null,
): FeedItem {
    return {
        kind: 'blog',
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        category: row.category,
        imageUrl: row.imageUrl,
        author: row.author,
        publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
        readMinutes: readMinutes(row.content || ''),
        cta: cta(row),
        relatedClass,
    };
}

/** Sort key for the merged feed: pinned first, then newest publish date. */
export function feedSortValue(item: FeedItem): number {
    const pinned = 'pinned' in item && item.pinned ? 1 : 0;
    const ts = item.publishedAt ? Date.parse(item.publishedAt) : 0;
    return pinned * 1e15 + ts;
}
