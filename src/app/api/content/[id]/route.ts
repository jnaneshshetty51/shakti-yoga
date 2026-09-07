import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serializeContent, serializeBlog, readMinutes } from '@/lib/content';

export const dynamic = 'force-dynamic';

/**
 * A single feed item — a Content row by id, or a BlogPost by id or slug.
 * Blog responses carry the full markdown `body`.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const session = await getSession();

    try {
        const content = await prisma.content.findFirst({
            where: { id, status: 'PUBLISHED' },
        });
        if (content) {
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
            const item = serializeContent(content, { liked, saved });
            let relatedBlog = null;
            if (content.relatedBlogId) {
                const blog = await prisma.blogPost.findUnique({ where: { id: content.relatedBlogId } });
                if (blog && blog.status === 'PUBLISHED') relatedBlog = serializeBlog(blog);
            }
            return NextResponse.json({ item, relatedBlog }, { headers: { 'Cache-Control': 'no-store' } });
        }

        const blog =
            (await prisma.blogPost.findUnique({ where: { id } })) ??
            (await prisma.blogPost.findUnique({ where: { slug: id } }));
        if (blog && blog.status === 'PUBLISHED') {
            let relatedClass: { id: string; name: string } | null = null;
            if (blog.relatedClassBatchId) {
                relatedClass = await prisma.classBatch.findUnique({
                    where: { id: blog.relatedClassBatchId },
                    select: { id: true, name: true },
                });
            }
            return NextResponse.json(
                {
                    item: {
                        ...serializeBlog(blog, relatedClass),
                        body: blog.content,
                        readMinutes: readMinutes(blog.content || ''),
                    },
                },
                { headers: { 'Cache-Control': 'no-store' } },
            );
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (error) {
        console.error('[content/:id] failed', error);
        return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
    }
}
