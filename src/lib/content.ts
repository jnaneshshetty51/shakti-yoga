import type { Content, ContentCategory, ContentDifficulty, ContentAccess } from '@prisma/client';

export const CONTENT_ACCESS_LEVELS: ContentAccess[] = ['PUBLIC', 'ACCOUNT_REQUIRED', 'MEMBERSHIP_REQUIRED', 'THERAPY_ONLY'];

export const ACCESS_LABEL: Record<ContentAccess, string> = {
    PUBLIC: 'Public',
    ACCOUNT_REQUIRED: 'Account required',
    MEMBERSHIP_REQUIRED: 'Membership required',
    THERAPY_ONLY: 'Therapy only',
};

export function toContentAccess(v: unknown): ContentAccess {
    const s = String(v || '').toUpperCase();
    return (CONTENT_ACCESS_LEVELS as string[]).includes(s) ? (s as ContentAccess) : 'PUBLIC';
}

/** CTA intents an item can carry. The app resolves these to a destination. */
export const CTA_TYPES = [
    'none',
    'join_next_class',
    'view_classes',
    'book_therapy',
    'open_content',
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
    'THERAPY',
    'STUDIO',
    'COMMUNITY',
];

/** Admin-facing label — decoupled from the stored enum value (e.g. MINDFULNESS reads "Meditation"). */
export const CATEGORY_LABEL: Record<ContentCategory, string> = {
    YOGA: 'General Yoga',
    BREATHING: 'Breathing',
    MINDFULNESS: 'Meditation',
    MOBILITY: 'Mobility',
    SLEEP: 'Sleep',
    STRENGTH: 'Strength',
    WELLNESS: 'Wellness',
    BEGINNERS: 'Beginners',
    PHILOSOPHY: 'Philosophy',
    THERAPY: 'Therapy',
    STUDIO: 'Studio',
    COMMUNITY: 'Community',
};

export const CONTENT_DIFFICULTIES: ContentDifficulty[] = ['BEGINNER', 'INTERMEDIATE', 'ALL_LEVELS', 'ADVANCED'];

export const DIFFICULTY_LABEL: Record<ContentDifficulty, string> = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ALL_LEVELS: 'All levels',
    ADVANCED: 'Advanced',
};

/**
 * The seven content types Shakti supports — deliberately kept to this list,
 * not one type per media format. See docs/content-management.md.
 */
export const CONTENT_TYPES = [
    'VIDEO',
    'AUDIO',
    'ARTICLE',
    'SHORT_PRACTICE',
    'TAKE_A_MOMENT',
    'FOUNDER_MESSAGE',
    'ANNOUNCEMENT',
] as const;

export const CONTENT_TYPE_LABEL: Record<(typeof CONTENT_TYPES)[number], string> = {
    VIDEO: 'Video',
    AUDIO: 'Audio',
    ARTICLE: 'Article',
    SHORT_PRACTICE: 'Short Practice',
    TAKE_A_MOMENT: 'Take a Moment',
    FOUNDER_MESSAGE: 'Founder Message',
    ANNOUNCEMENT: 'Announcement',
};

/** Types that can be "completed" by a member — feeds gamification (see src/lib/achievements.ts, challenges.ts). */
export const COMPLETABLE_TYPES = ['VIDEO', 'AUDIO', 'SHORT_PRACTICE', 'TAKE_A_MOMENT'] as const;

export function isCtaType(v: unknown): v is CtaType {
    return typeof v === 'string' && (CTA_TYPES as readonly string[]).includes(v);
}

export function toContentCategory(v: unknown): ContentCategory {
    const s = String(v || '').toUpperCase();
    return (CONTENT_CATEGORIES as string[]).includes(s) ? (s as ContentCategory) : 'YOGA';
}

export function toContentDifficulty(v: unknown): ContentDifficulty | null {
    const s = String(v || '').toUpperCase();
    return (CONTENT_DIFFICULTIES as string[]).includes(s) ? (s as ContentDifficulty) : null;
}

export interface Cta {
    type: CtaType;
    label: string | null;
    contentId: string | null;
}

export type WireKind = 'video' | 'audio' | 'article' | 'founder_message' | 'announcement';

/** Feed-native item shape for /api/content/feed, /api/content/home, /api/content/[id], /api/content/saved. */
export interface FeedItem {
    kind: WireKind;
    id: string;
    title: string;
    slug: string | null;
    excerpt: string | null;
    caption: string | null;
    body: string | null;
    category: ContentCategory;
    instagramUrl: string | null;
    imageUrl: string | null;
    videoUrl: string | null;
    audioUrl: string | null;
    mediaUrls: string[];
    author: string;
    tags: string[];
    publishedAt: string | null;
    pinned: boolean;
    featured: boolean;
    important: boolean;
    likeCount: number;
    saveCount: number;
    commentCount: number;
    liked: boolean;
    saved: boolean;
    cta: Cta;
    readMinutes: number | null; // ARTICLE / FOUNDER_MESSAGE only
    relatedClass: { id: string; name: string } | null;
}

function cta(row: Pick<Content, 'ctaType' | 'ctaLabel' | 'relatedContentId'>): Cta {
    return {
        type: isCtaType(row.ctaType) ? row.ctaType : 'none',
        label: row.ctaLabel || null,
        contentId: row.relatedContentId || null,
    };
}

/** Rough read time from a markdown/plain body (~200 wpm, min 1). */
export function readMinutes(body: string): number {
    const words = body.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
}

const KIND_BY_TYPE: Record<string, WireKind> = {
    VIDEO: 'video',
    AUDIO: 'audio',
    ARTICLE: 'article',
    FOUNDER_MESSAGE: 'founder_message',
    ANNOUNCEMENT: 'announcement',
};

/** True for the types shown in the generic mixed feed (Explore/Home). Practice types have their own /api/practices surface. */
export function isFeedType(type: string): boolean {
    return type in KIND_BY_TYPE;
}

export function serializeContent(
    row: Content,
    flags: { liked: boolean; saved: boolean; relatedClass?: { id: string; name: string } | null } = { liked: false, saved: false },
): FeedItem {
    const kind = KIND_BY_TYPE[row.type];
    if (!kind) throw new Error(`serializeContent: type ${row.type} has no feed representation`);
    return {
        kind,
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        caption: row.caption,
        body: row.body,
        category: row.category,
        instagramUrl: row.instagramUrl,
        imageUrl: row.imageUrl,
        videoUrl: row.videoUrl,
        audioUrl: row.audioUrl,
        mediaUrls: row.mediaUrls,
        author: row.author,
        tags: row.tags,
        publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
        pinned: row.pinned,
        featured: row.featured,
        important: row.important,
        likeCount: row.likeCount,
        saveCount: row.saveCount,
        commentCount: row.commentCount,
        liked: flags.liked,
        saved: flags.saved,
        cta: cta(row),
        readMinutes: kind === 'article' || kind === 'founder_message' ? readMinutes(row.body || '') : null,
        relatedClass: flags.relatedClass ?? null,
    };
}

/** Sort key for the merged feed: pinned first, then newest publish date. */
export function feedSortValue(item: FeedItem): number {
    const pinned = item.pinned ? 1 : 0;
    const ts = item.publishedAt ? Date.parse(item.publishedAt) : 0;
    return pinned * 1e15 + ts;
}
