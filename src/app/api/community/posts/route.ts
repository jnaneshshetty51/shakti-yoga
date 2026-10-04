import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { serializeCommunityPost, MAX_POST_LEN } from '@/lib/community';
import { toStorageKey } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/** POST /api/community/posts — create a post (text + optional image). */
export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { allowed, retryAfterSeconds } = await rateLimit(`community-post:${session.id}`, 6, 10 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'You are posting too fast. Try again shortly.' },
            { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
        );
    }

    const json = await request.json().catch(() => ({}));
    const body = String(json.body ?? '').trim().slice(0, MAX_POST_LEN);
    const rawImageUrl = typeof json.imageUrl === 'string' && json.imageUrl.trim().length > 0 ? json.imageUrl.trim() : null;
    // Only accept URLs that resolve to a key in our own storage — never an arbitrary
    // third-party URL rendered to every viewer of the feed.
    const imageUrl = rawImageUrl && toStorageKey(rawImageUrl) ? rawImageUrl : null;
    if (rawImageUrl && !imageUrl) {
        return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
    }

    if (body.length < 1 && !imageUrl) {
        return NextResponse.json({ error: 'Write something or attach an image.' }, { status: 400 });
    }

    const post = await prisma.communityPost.create({
        data: { userId: session.id, body: body || ' ', imageUrl },
        select: {
            id: true, body: true, imageUrl: true, likeCount: true, commentCount: true,
            createdAt: true, userId: true,
            user: { select: { name: true, avatarUrl: true } },
        },
    });

    return NextResponse.json({ post: serializeCommunityPost(post, session.id, false) }, { status: 201 });
}
