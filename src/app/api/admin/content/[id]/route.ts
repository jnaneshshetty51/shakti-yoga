import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** One Content row, mapped to the same flat shape the admin list/edit forms use (see api/admin/content GET). */
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
    const payload = await requireDepartment('CONTENT');
    if (!payload) return forbidden();

    const { id } = await props.params;
    const row = await prisma.content.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
        content: {
            id: row.id,
            contentType: row.type,
            status: row.status,
            category: row.category,
            title: row.title,
            slug: row.slug || '',
            excerpt: row.excerpt || '',
            body: row.body || '',
            caption: row.caption || '',
            steps: row.steps || '',
            instagramUrl: row.instagramUrl || '',
            imageUrl: row.imageUrl || '',
            videoUrl: row.videoUrl || '',
            audioUrl: row.audioUrl || '',
            durationMin: row.durationMin ?? '',
            difficulty: row.difficulty || '',
            language: row.language,
            ctaType: row.ctaType || 'none',
            ctaLabel: row.ctaLabel || '',
            relatedContentId: row.relatedContentId || '',
            relatedClassBatchId: row.relatedClassBatchId || '',
            access: row.access,
            author: row.author,
            tags: row.tags.join(', '),
            pinned: row.pinned,
            featured: row.featured,
            important: row.important,
            audience: row.audience.join(', '),
            mediaUrls: row.mediaUrls.join('\n'),
            expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
            notifyOnPublish: row.notifyOnPublish,
            publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
            scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
            metaTitle: row.metaTitle || '',
            metaDescription: row.metaDescription || '',
            submittedForReviewAt: row.submittedForReviewAt ? row.submittedForReviewAt.toISOString() : null,
            reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
            reviewNote: row.reviewNote || '',
            approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
        },
    });
}
