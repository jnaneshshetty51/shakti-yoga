import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serializeContent, type FeedItem } from '@/lib/content';

export const dynamic = 'force-dynamic';

/** GET /api/content/saved — the caller's saved Content, newest save first. */
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
            .filter((s) => s.content && s.content.status === 'PUBLISHED')
            .map((s) => serializeContent(s.content!, { saved: true, liked: liked.has(s.contentId) }));

        if (type === 'reel') items = items.filter((i) => i.kind === 'reel');
        else if (type === 'post') items = items.filter((i) => i.kind === 'post' || i.kind === 'announcement');

        return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('[content/saved] failed', error);
        return NextResponse.json({ items: [] });
    }
}
