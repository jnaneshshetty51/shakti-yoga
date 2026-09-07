import { mediaSrc, toStorageKey } from '@/lib/storage';

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

interface PostRow {
    id: string;
    body: string;
    imageUrl: string | null;
    likeCount: number;
    commentCount: number;
    createdAt: Date;
    userId: string;
    user: { name: string; avatarUrl: string | null };
}

export function serializeCommunityPost(row: PostRow, viewerId: string | null, liked: boolean) {
    return {
        id: row.id,
        body: row.body,
        imageUrl: media(row.imageUrl),
        author: row.user.name,
        avatarUrl: media(row.user.avatarUrl),
        likeCount: row.likeCount,
        commentCount: row.commentCount,
        createdAt: row.createdAt.toISOString(),
        mine: row.userId === viewerId,
        liked,
    };
}

interface CommentRow {
    id: string;
    body: string;
    createdAt: Date;
    userId: string;
    user: { name: string; avatarUrl: string | null };
}

export function serializeCommunityComment(row: CommentRow, viewerId: string | null) {
    return {
        id: row.id,
        body: row.body,
        author: row.user.name,
        avatarUrl: media(row.user.avatarUrl),
        createdAt: row.createdAt.toISOString(),
        mine: row.userId === viewerId,
    };
}
