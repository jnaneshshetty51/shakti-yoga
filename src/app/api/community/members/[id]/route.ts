import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getSessionStats } from '@/lib/sessionCredits';
import { serializeCommunityPost, getReactionSummaries } from '@/lib/community';
import { mediaSrc, toStorageKey } from '@/lib/storage';

export const dynamic = 'force-dynamic';

function media(url: string | null): string | null {
    if (!url) return null;
    const key = toStorageKey(url);
    return key ? mediaSrc(key) : url;
}

/** GET /api/community/members/:id — public member profile for community viewing */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            avatarUrl: true,
            role: true,
            createdAt: true,
            subscription: {
                select: { planType: true, status: true },
            },
        },
    });

    if (!user) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const [stats, posts, totalPosts] = await Promise.all([
        getSessionStats(id).catch(() => ({ totalThisCycle: 0, totalAllTime: 0, currentStreak: 0 })),
        prisma.communityPost.findMany({
            where: { userId: id, hidden: false },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true, body: true, imageUrl: true, likeCount: true, commentCount: true,
                createdAt: true, userId: true,
                user: { select: { name: true, avatarUrl: true } },
            },
        }),
        prisma.communityPost.count({ where: { userId: id, hidden: false } }),
    ]);

    const summaries = await getReactionSummaries(posts.map((p) => p.id), session.id);
    const serializedPosts = posts.map((p) => {
        const summary = summaries.get(p.id)!;
        return serializeCommunityPost(p, session.id, summary.myReaction, summary.reactionCounts);
    });

    const sub = user.subscription;
    let tierLabel = 'Member';
    if (user.role === 'TEACHER' || user.role === 'STAFF_ADMIN' || user.role === 'SUPER_ADMIN') {
        tierLabel = 'Yoga Teacher';
    } else if (sub?.status === 'ACTIVE' || sub?.status === 'TRIAL') {
        if (sub.planType === 'EVERYDAY_YOGA') tierLabel = 'Everyday Yogi';
        else if (sub.planType === 'YOGA_THERAPY') tierLabel = 'Yoga Therapy Member';
        else if (sub.planType === 'STARTER') tierLabel = 'Starter Member';
    } else if (user.role === 'MEMBER_EVERYDAY') {
        tierLabel = 'Everyday Yogi';
    } else if (user.role === 'MEMBER_THERAPY') {
        tierLabel = 'Yoga Therapy Member';
    }

    return NextResponse.json({
        member: {
            id: user.id,
            name: user.name,
            avatarUrl: media(user.avatarUrl),
            tier: tierLabel,
            memberSince: user.createdAt.toISOString(),
            stats: {
                totalClasses: stats.totalAllTime,
                currentStreak: stats.currentStreak,
                totalPosts,
            },
            recentPosts: serializedPosts,
        },
    });
}
