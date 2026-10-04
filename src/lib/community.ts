import { mediaSrc, toStorageKey } from '@/lib/storage';
import { prisma } from '@/lib/prisma';

export const COMMENT_HIDE_THRESHOLD = 3;
export const POST_HIDE_THRESHOLD = 4;
export const MAX_POST_LEN = 2000;
export const MAX_COMMENT_LEN = 1000;

/** Normalise a stored media reference to an /api/media path (or pass through). */
function media(url: string | null): string | null {
    if (!url) return null;
    const key = toStorageKey(url);
    return key ? mediaSrc(key) : url;
}

export const ALLOWED_REACTIONS = ['❤️', '🙏', '🌸', '🔥', '👏'] as const;
export type AllowedReaction = (typeof ALLOWED_REACTIONS)[number];

interface ReactionSummary {
    reactionCounts: Record<string, number>;
    myReaction: string | null;
}

/** Reaction counts + the viewer's own reaction for one post, aggregated in the DB (not fetched row-by-row). */
export async function getReactionSummary(postId: string, viewerId: string | null): Promise<ReactionSummary> {
    const [groups, mine] = await Promise.all([
        prisma.communityInteraction.groupBy({
            by: ['reaction'],
            where: { postId },
            _count: true,
        }),
        viewerId
            ? prisma.communityInteraction.findUnique({
                where: { userId_postId: { userId: viewerId, postId } },
                select: { reaction: true },
            })
            : Promise.resolve(null),
    ]);
    const reactionCounts: Record<string, number> = {};
    for (const g of groups) reactionCounts[g.reaction] = g._count;
    return { reactionCounts, myReaction: mine?.reaction ?? null };
}

/** Same as getReactionSummary, batched for a page of posts (feed / member profile) in two queries instead of N. */
export async function getReactionSummaries(
    postIds: string[],
    viewerId: string | null,
): Promise<Map<string, ReactionSummary>> {
    const result = new Map<string, ReactionSummary>();
    for (const id of postIds) result.set(id, { reactionCounts: {}, myReaction: null });
    if (postIds.length === 0) return result;

    const [groups, mine] = await Promise.all([
        prisma.communityInteraction.groupBy({
            by: ['postId', 'reaction'],
            where: { postId: { in: postIds } },
            _count: true,
        }),
        viewerId
            ? prisma.communityInteraction.findMany({
                where: { postId: { in: postIds }, userId: viewerId },
                select: { postId: true, reaction: true },
            })
            : Promise.resolve([]),
    ]);
    for (const g of groups) {
        result.get(g.postId)!.reactionCounts[g.reaction] = g._count;
    }
    for (const m of mine) {
        result.get(m.postId)!.myReaction = m.reaction;
    }
    return result;
}

interface PostRow {
    id: string;
    body: string;
    imageUrl: string | null;
    likeCount: number;
    commentCount: number;
    createdAt: Date;
    userId: string;
    user: { name: string; avatarUrl: string | null };
    interactions?: { reaction: string; userId: string }[];
}

export function serializeCommunityPost(
    row: PostRow,
    viewerId: string | null,
    likedOrReaction: boolean | string | null = false,
    reactionCounts: Record<string, number> = {},
) {
    const userReaction =
        typeof likedOrReaction === 'string'
            ? likedOrReaction
            : likedOrReaction === true
                ? '❤️'
                : null;
    return {
        id: row.id,
        body: row.body,
        imageUrl: media(row.imageUrl),
        author: row.user.name,
        authorId: row.userId,
        avatarUrl: media(row.user.avatarUrl),
        likeCount: row.likeCount,
        commentCount: row.commentCount,
        createdAt: row.createdAt.toISOString(),
        mine: row.userId === viewerId,
        liked: Boolean(likedOrReaction),
        userReaction,
        reactionCounts,
    };
}

interface CommentRow {
    id: string;
    body: string;
    parentId?: string | null;
    createdAt: Date;
    userId: string;
    user: { name: string; avatarUrl: string | null };
    replies?: CommentRow[];
}

export interface SerializedComment {
    id: string;
    body: string;
    parentId: string | null;
    author: string;
    authorId: string;
    avatarUrl: string | null;
    createdAt: string;
    mine: boolean;
    replies: SerializedComment[];
}

export function serializeCommunityComment(row: CommentRow, viewerId: string | null): SerializedComment {
    return {
        id: row.id,
        body: row.body,
        parentId: row.parentId ?? null,
        author: row.user.name,
        authorId: row.userId,
        avatarUrl: media(row.user.avatarUrl),
        createdAt: row.createdAt.toISOString(),
        mine: row.userId === viewerId,
        replies: row.replies ? row.replies.map((r) => serializeCommunityComment(r, viewerId)) : [],
    };
}
