import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serializeContent, isFeedType, type FeedItem, type WireKind } from '@/lib/content';

export const dynamic = 'force-dynamic';

/** GET /api/content/saved?type=all|video|audio|article|founder_message|announcement — the caller's saved Content, newest save first. */
export async function GET(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const type = (new URL(request.url).searchParams.get('type') || 'all').toLowerCase();

    try {
        const saves = await prisma.contentInteraction.findMany({
            where: { userId: session.id, kind: 'save' },
            orderBy: { createdAt: 'desc' },
            include: { content: true },
            take: 100,
        });

        // Which of these are also liked?
        const liked = new Set(
            (
                await prisma.contentInteraction.findMany({
                    where: { userId: session.id, kind: 'like', contentId: { in: saves.map((s) => s.contentId) } },
                    select: { contentId: true },
                })
            ).map((i) => i.contentId),
        );

        let items: FeedItem[] = saves
            .filter((s) => s.content && s.content.status === 'PUBLISHED' && isFeedType(s.content.type))
            .map((s) => serializeContent(s.content!, { saved: true, liked: liked.has(s.contentId) }));

        if (type !== 'all') items = items.filter((i) => i.kind === (type as WireKind));

        return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('[content/saved] failed', error);
        return NextResponse.json({ items: [] });
    }
}
