import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTeacher } from '@/lib/admin-auth';
import { ContentStatus, ContentType, Prisma } from '@prisma/client';
import { toContentCategory } from '@/lib/content';
import { notifyContentPublished } from '@/lib/content-notify';
import { truncate as cap } from '@/lib/validation';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

function toTags(v: unknown): string[] {
    if (Array.isArray(v)) v = v.join(',');
    return [...new Set(String(v || '').split(/[,\n]/).map((t) => t.trim().replace(/^#/, '')).filter(Boolean))].slice(0, 10);
}

function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function uniqueSlug(base: string, ownId?: string): Promise<string> {
    let slug = base || `article-${Date.now()}`;
    let n = 2;
    for (;;) {
        const clash = await prisma.content.findUnique({ where: { slug }, select: { id: true } });
        if (!clash || clash.id === ownId) return slug;
        slug = `${base}-${n++}`;
    }
}

export async function GET(request: Request) {
    try {
        const teacher = await requireTeacher();
        if (!teacher) return forbidden();

        const url = new URL(request.url);
        const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
        const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
        const q = url.searchParams.get('q')?.trim();
        const statusFilter = url.searchParams.get('status');

        const baseWhere: Prisma.ContentWhereInput = {
            type: ContentType.ARTICLE,
            createdByUserId: teacher.id,
        };

        const where: Prisma.ContentWhereInput = {
            ...baseWhere,
            ...(q
                ? {
                      OR: [
                          { title: { contains: q, mode: 'insensitive' } },
                          { excerpt: { contains: q, mode: 'insensitive' } },
                          { body: { contains: q, mode: 'insensitive' } },
                      ],
                  }
                : {}),
            ...(statusFilter && statusFilter in ContentStatus
                ? { status: statusFilter as ContentStatus }
                : {}),
        };

        const [posts, totalCount, allCount, publishedCount, draftCount, inReviewCount] = await Promise.all([
            prisma.content.findMany({
                where,
                orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    status: true,
                    category: true,
                    author: true,
                    imageUrl: true,
                    excerpt: true,
                    viewCount: true,
                    publishedAt: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            prisma.content.count({ where }),
            prisma.content.count({ where: baseWhere }),
            prisma.content.count({ where: { ...baseWhere, status: ContentStatus.PUBLISHED } }),
            prisma.content.count({ where: { ...baseWhere, status: ContentStatus.DRAFT } }),
            prisma.content.count({ where: { ...baseWhere, status: ContentStatus.IN_REVIEW } }),
        ]);

        return NextResponse.json({
            posts,
            totalCount,
            page,
            pageSize,
            counts: {
                all: allCount,
                published: publishedCount,
                draft: draftCount,
                inReview: inReviewCount,
            },
            teacherName: teacher.name,
        });
    } catch (error) {
        console.error('Teacher blog GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const teacher = await requireTeacher();
        if (!teacher) return forbidden();

        const body = await request.json().catch(() => ({}));
        const title = cap(body.title || 'Untitled', 200);
        if (!title.trim()) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const explicitSlug = cap(body.slug, 200);
        const slug = await uniqueSlug(slugify(explicitSlug || title));

        // Ensure author is set to teacher name if not specified or empty
        const authorName = cap(body.author || teacher.name || 'Trainer', 120);

        const statusStr = String(body.status || 'PUBLISHED').toUpperCase();
        const status: ContentStatus = statusStr in ContentStatus ? (statusStr as ContentStatus) : ContentStatus.DRAFT;

        const isPublished = status === ContentStatus.PUBLISHED;
        const isInReview = status === ContentStatus.IN_REVIEW;

        const post = await prisma.content.create({
            data: {
                type: ContentType.ARTICLE,
                status,
                access: 'PUBLIC',
                title,
                slug,
                author: authorName,
                createdByUserId: teacher.id,
                category: toContentCategory(body.category),
                tags: toTags(body.tags),
                excerpt: cap(body.excerpt, 500) || null,
                body: cap(body.body, 100_000) || null,
                imageUrl: body.imageUrl ? String(body.imageUrl) : null,
                submittedByUserId: isInReview ? teacher.id : null,
                submittedForReviewAt: isInReview ? new Date() : null,
                publishedAt: isPublished ? new Date() : null,
                approvedByUserId: isPublished ? teacher.id : null,
                approvedAt: isPublished ? new Date() : null,
            },
        });

        if (isPublished) {
            void notifyContentPublished(post.id);
        }

        return NextResponse.json({ post });
    } catch (error) {
        console.error('Teacher blog POST error:', error);
        return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const teacher = await requireTeacher();
        if (!teacher) return forbidden();

        const body = await request.json().catch(() => ({}));
        const id = String(body.id || '');
        if (!id) return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });

        const existing = await prisma.content.findUnique({
            where: { id },
            select: { id: true, createdByUserId: true, slug: true, status: true },
        });

        if (!existing) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

        // Ensure teacher owns this post or is an admin
        if (existing.createdByUserId !== teacher.id && teacher.role !== 'admin') {
            return forbidden();
        }

        const data: Prisma.ContentUncheckedUpdateInput = {};

        if (typeof body.title === 'string') {
            data.title = cap(body.title, 200);
        }
        if (typeof body.body === 'string') {
            data.body = cap(body.body, 100_000);
        }
        if (typeof body.excerpt === 'string') {
            data.excerpt = cap(body.excerpt, 500) || null;
        }
        if (body.imageUrl !== undefined) {
            data.imageUrl = body.imageUrl ? String(body.imageUrl) : null;
        }
        if (body.category !== undefined) {
            data.category = toContentCategory(body.category);
        }
        if (body.tags !== undefined) {
            data.tags = toTags(body.tags);
        }
        if (body.author !== undefined) {
            data.author = cap(body.author || teacher.name || 'Trainer', 120);
        }

        if (typeof body.slug === 'string' && body.slug.trim()) {
            const nextSlug = slugify(body.slug);
            if (nextSlug !== existing.slug) {
                data.slug = await uniqueSlug(nextSlug, id);
            }
        }

        if (typeof body.status === 'string') {
            const nextStatus = body.status.toUpperCase();
            if (nextStatus in ContentStatus) {
                data.status = nextStatus as ContentStatus;
                if (nextStatus === ContentStatus.PUBLISHED && existing.status !== ContentStatus.PUBLISHED) {
                    data.publishedAt = new Date();
                    data.approvedByUserId = teacher.id;
                    data.approvedAt = new Date();
                } else if (nextStatus === ContentStatus.IN_REVIEW && existing.status !== ContentStatus.IN_REVIEW) {
                    data.submittedByUserId = teacher.id;
                    data.submittedForReviewAt = new Date();
                }
            }
        }

        const updated = await prisma.content.update({
            where: { id },
            data,
        });

        if (updated.status === ContentStatus.PUBLISHED && existing.status !== ContentStatus.PUBLISHED) {
            void notifyContentPublished(updated.id);
        }

        return NextResponse.json({ post: updated });
    } catch (error) {
        console.error('Teacher blog PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const teacher = await requireTeacher();
        if (!teacher) return forbidden();

        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });

        const existing = await prisma.content.findUnique({
            where: { id },
            select: { id: true, createdByUserId: true, status: true },
        });

        if (!existing) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

        if (existing.createdByUserId !== teacher.id && teacher.role !== 'admin') {
            return forbidden();
        }

        if (existing.status === ContentStatus.DRAFT) {
            await prisma.content.delete({ where: { id } });
            return NextResponse.json({ deleted: true });
        } else {
            // Archive published/in-review content to preserve history
            await prisma.content.update({
                where: { id },
                data: { status: ContentStatus.ARCHIVED },
            });
            return NextResponse.json({ archived: true });
        }
    } catch (error) {
        console.error('Teacher blog DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
    }
}
