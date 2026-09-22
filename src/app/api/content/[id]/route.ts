import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serializeContent, isFeedType } from '@/lib/content';
import { canAccessContent } from '@/lib/content-audience';

export const dynamic = 'force-dynamic';

/**
 * A single feed item, looked up by id or (for ARTICLE / FOUNDER_MESSAGE)
 * slug. If the caller doesn't meet the access requirement, returns a locked
 * preview (title/excerpt/thumbnail only) instead of a 404 or the full item —
 * this is the "free preview -> Join Shakti" surface for gated content.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();

    try {
        const content =
            (await prisma.content.findFirst({ where: { id, status: 'PUBLISHED' } })) ??
            (await prisma.content.findFirst({ where: { slug: id, status: 'PUBLISHED' } }));
        if (!content || !isFeedType(content.type)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const canAccess = await canAccessContent(session?.id ?? null, content);
        if (!canAccess) {
            return NextResponse.json(
                {
                    locked: true,
                    preview: {
                        id: content.id,
                        title: content.title,
                        excerpt: content.excerpt,
                        caption: content.caption,
                        imageUrl: content.imageUrl,
                        access: content.access,
                    },
                },
                { headers: { 'Cache-Control': 'no-store' } },
            );
        }

        let liked = false;
        let saved = false;
        if (session) {
            const ix = await prisma.contentInteraction.findMany({
                where: { userId: session.id, contentId: content.id },
                select: { kind: true },
            });
            liked = ix.some((i) => i.kind === 'like');
            saved = ix.some((i) => i.kind === 'save');
        }

        let relatedClass: { id: string; name: string } | null = null;
        if (content.relatedClassBatchId) {
            relatedClass = await prisma.classBatch.findUnique({
                where: { id: content.relatedClassBatchId },
                select: { id: true, name: true },
            });
        }

        const item = serializeContent(content, { liked, saved, relatedClass });
        return NextResponse.json({ locked: false, item }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('[content/:id] failed', error);
        return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
    }
}
