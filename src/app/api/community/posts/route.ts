import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { serializeCommunityPost, MAX_POST_LEN } from '@/lib/community';

export const dynamic = 'force-dynamic';

/** POST /api/community/posts — create a post. Text only for now. */
export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { allowed, retryAfterSeconds } = rateLimit(`community-post:${session.id}`, 6, 10 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'You are posting too fast. Try again shortly.' },
            { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
        );
    }

    const body = String((await request.json().catch(() => ({}))).body ?? '').trim().slice(0, MAX_POST_LEN);
    if (body.length < 1) return NextResponse.json({ error: 'Write something first.' }, { status: 400 });

    const post = await prisma.communityPost.create({
        data: { userId: session.id, body },
        select: {
            id: true, body: true, imageUrl: true, likeCount: true, commentCount: true,
            createdAt: true, userId: true,
            user: { select: { name: true, avatarUrl: true } },
        },
    });

    return NextResponse.json({ post: serializeCommunityPost(post, session.id, false) }, { status: 201 });
}
