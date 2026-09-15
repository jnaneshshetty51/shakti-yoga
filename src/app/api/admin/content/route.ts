import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, requireDepartment } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { toStorageKey, mediaSrc, deleteFile } from '@/lib/storage';
import { Prisma, Role, ContentStatus, ContentType } from '@prisma/client';
import { isCtaType, toContentCategory, toContentDifficulty, toContentAccess, serializeContent, isFeedType } from '@/lib/content';
import { notifyContentPublished } from '@/lib/content-notify';
import { truncate as cap } from '@/lib/validation';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });
type ResourceType = 'story' | 'whatsapp' | 'content';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const INSTAGRAM_RE = /^https:\/\/(www\.)?instagram\.com\/(reel|p|tv)\/[A-Za-z0-9_-]+\/?/i;

function toContentType(v: unknown): ContentType {
    const s = String(v || '').toUpperCase();
    return s in ContentType ? (s as ContentType) : ContentType.ARTICLE;
}

/** Comma / newline separated -> trimmed, de-duped, capped list. */
function toTags(v: unknown): string[] {
    if (Array.isArray(v)) v = v.join(',');
    return [...new Set(String(v || '').split(/[,\n]/).map((t) => t.trim().replace(/^#/, '')).filter(Boolean))].slice(0, 10);
}

const PLAN_TIERS = ['starter', 'everyday', 'family', 'therapy', 'trial'];
function toAudience(v: unknown): string[] {
    if (Array.isArray(v)) return v.map(String).filter((t) => PLAN_TIERS.includes(t));
    return String(v || '').split(/[,\n]/).map((t) => t.trim().toLowerCase()).filter((t) => PLAN_TIERS.includes(t));
}

/** Newline / comma separated media paths we produced -> resolved /api/media urls. */
function toMediaUrls(v: unknown): string[] {
    const parts = Array.isArray(v) ? v.map(String) : String(v || '').split(/[,\n]/);
    return parts
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (toStorageKey(s) ? mediaSrc(toStorageKey(s)!) : null))
        .filter((s): s is string => !!s)
        .slice(0, 10);
}

function toContentStatus(v: unknown): ContentStatus {
    const s = String(v || '').toUpperCase();
    return s in ContentStatus ? (s as ContentStatus) : ContentStatus.DRAFT;
}

function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function uniqueSlug(base: string, ownId: string | undefined): Promise<string> {
    let slug = base || `content-${Date.now()}`;
    let n = 2;
    for (;;) {
        const clash = await prisma.content.findUnique({ where: { slug }, select: { id: true } });
        if (!clash || clash.id === ownId) return slug;
        slug = `${base}-${n++}`;
    }
}

export async function GET(request: Request) {
    try {
        const payload = await requireDepartment('CONTENT');
        if (!payload) return forbidden();

        const url = new URL(request.url);
        const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE));
        const q = url.searchParams.get('q')?.trim();
        const statusFilter = url.searchParams.get('status'); // DRAFT | IN_REVIEW | APPROVED | PUBLISHED | ARCHIVED | SCHEDULED
        const typeFilter = url.searchParams.get('contentType');
        const sortKey = url.searchParams.get('sortKey');
        const sortDir: Prisma.SortOrder = url.searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
        const now = new Date();

        const contentWhere: Prisma.ContentWhereInput = {
            ...(q
                ? {
                      OR: [
                          { title: { contains: q, mode: 'insensitive' } },
                          { body: { contains: q, mode: 'insensitive' } },
                          { caption: { contains: q, mode: 'insensitive' } },
                          { author: { contains: q, mode: 'insensitive' } },
                      ],
                  }
                : {}),
            ...(statusFilter === 'SCHEDULED'
                ? { scheduledAt: { gt: now }, status: { not: 'PUBLISHED' } }
                : statusFilter && statusFilter in ContentStatus
                  ? { status: statusFilter as ContentStatus }
                  : {}),
            ...(typeFilter && typeFilter in ContentType ? { type: typeFilter as ContentType } : {}),
        };

        const contentOrderBy: Prisma.ContentOrderByWithRelationInput[] =
            sortKey === 'title' ? [{ title: sortDir }] : [{ pinned: 'desc' }, { createdAt: 'desc' }];

        const [stories, groups, contentRows, contentTotalCount, draftsCount, inReviewCount, publishedCount, scheduledCount, archivedCount, classBatches, contentOptionsRaw] =
            await Promise.all([
                prisma.story.findMany({ include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }),
                prisma.whatsAppGroup.findMany({ where: { active: true } }),
                prisma.content.findMany({ where: contentWhere, orderBy: contentOrderBy, skip: (page - 1) * pageSize, take: pageSize }),
                prisma.content.count({ where: contentWhere }),
                prisma.content.count({ where: { status: 'DRAFT' } }),
                prisma.content.count({ where: { status: 'IN_REVIEW' } }),
                prisma.content.count({ where: { status: 'PUBLISHED' } }),
                prisma.content.count({ where: { status: { not: 'PUBLISHED' }, scheduledAt: { gt: now } } }),
                prisma.content.count({ where: { status: 'ARCHIVED' } }),
                prisma.classBatch.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
                prisma.content.findMany({ select: { id: true, title: true, type: true }, orderBy: { title: 'asc' }, take: 500 }),
            ]);

        const formattedStories = stories.map((story) => ({
            id: story.id,
            name: story.user?.name || story.authorName,
            authorName: story.authorName,
            location: story.location || '',
            plan: story.planType || '',
            planType: story.planType || '',
            rating: story.rating,
            quote: story.quote,
            content: story.content || '',
            status: story.status,
            imageUrl: story.imageUrl || '',
        }));

        const formattedGroups = groups.map((group) => ({
            id: group.id,
            name: group.name,
            role: group.role,
            whatsappLink: group.link,
            pinnedMessage: group.pinnedMessage || '',
        }));

        const content = contentRows.map((row) => {
            const item = isFeedType(row.type) ? serializeContent(row) : null;
            return {
                ...item,
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
            };
        });

        return NextResponse.json({
            stories: formattedStories,
            groups: formattedGroups,
            content,
            page,
            pageSize,
            totalCount: contentTotalCount,
            classBatchOptions: classBatches.map((b) => ({ label: b.name, value: b.id })),
            contentOptions: contentOptionsRaw.map((c) => ({ label: `${c.title} (${c.type})`, value: c.id })),
            canApprove: !!(await requireAdmin()),
            counts: {
                drafts: draftsCount,
                inReview: inReviewCount,
                published: publishedCount,
                scheduled: scheduledCount,
                archived: archivedCount,
            },
        });
    } catch (error) {
        console.error('Admin content API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/** Snapshot the pre-edit state of a Content row so published changes stay auditable. */
async function snapshotVersion(id: string, editedByUserId: string, note?: string) {
    const current = await prisma.content.findUnique({ where: { id }, select: { title: true, body: true, status: true } });
    if (!current) return;
    const last = await prisma.contentVersion.findFirst({ where: { contentId: id }, orderBy: { version: 'desc' }, select: { version: true } });
    await prisma.contentVersion.create({
        data: {
            contentId: id,
            version: (last?.version ?? 0) + 1,
            title: current.title,
            body: current.body,
            status: current.status,
            editedByUserId,
            note: note || null,
        },
    });
}

async function upsertContent(
    type: ResourceType,
    body: Record<string, unknown>,
    isCreate: boolean,
    admin: { id: string; email: string },
    isFullAdmin: boolean,
) {
    const id = body.id as string | undefined;

    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
    const imageUrl = has('imageUrl')
        ? (typeof body.imageUrl === 'string' && toStorageKey(body.imageUrl) ? mediaSrc(toStorageKey(body.imageUrl)!) : body.imageUrl === '' ? null : undefined)
        : undefined;
    const videoUrl = has('videoUrl')
        ? (typeof body.videoUrl === 'string' && toStorageKey(body.videoUrl) ? mediaSrc(toStorageKey(body.videoUrl)!) : body.videoUrl === '' ? null : undefined)
        : undefined;
    const audioUrl = has('audioUrl')
        ? (typeof body.audioUrl === 'string' && toStorageKey(body.audioUrl) ? mediaSrc(toStorageKey(body.audioUrl)!) : body.audioUrl === '' ? null : undefined)
        : undefined;

    if (type === 'story') {
        if (isCreate) {
            return prisma.story.create({
                data: {
                    authorName: cap(body.authorName || body.name || 'Anonymous', 120),
                    location: cap(body.location, 120) || null,
                    planType: cap(body.planType, 60) || null,
                    quote: cap(body.quote, 600),
                    content: cap(body.content, 5000) || null,
                    rating: Math.min(5, Math.max(1, Math.trunc(Number(body.rating) || 5))),
                    status: toContentStatus(body.status ?? 'DRAFT'),
                    ...(imageUrl !== undefined ? { imageUrl } : {}),
                },
            });
        }
        const data: Record<string, unknown> = {};
        if (has('authorName') || has('name')) data.authorName = cap(body.authorName || body.name || 'Anonymous', 120);
        if (has('location')) data.location = cap(body.location, 120) || null;
        if (has('planType')) data.planType = cap(body.planType, 60) || null;
        if (has('quote')) data.quote = cap(body.quote, 600);
        if (has('content')) data.content = cap(body.content, 5000) || null;
        if (has('rating')) data.rating = Math.min(5, Math.max(1, Math.trunc(Number(body.rating) || 5)));
        if (has('status')) data.status = toContentStatus(body.status);
        if (imageUrl !== undefined) data.imageUrl = imageUrl;

        const touchesCopy = has('quote') || has('content') || has('authorName') || has('name') || has('rating');
        if (touchesCopy && !has('status')) {
            const cur = await prisma.story.findUnique({ where: { id }, select: { status: true } });
            if (cur?.status === 'PUBLISHED') data.status = 'DRAFT';
        }
        return prisma.story.update({ where: { id }, data });
    }

    if (type === 'content') {
        const subtype = toContentType(body.contentType);
        let status = toContentStatus(body.status);

        // A departmented CONTENT staff account (passed requireDepartment but
        // not requireAdmin) can draft and submit for review, but cannot move
        // anything to APPROVED or PUBLISHED directly — that needs a full/super
        // admin. See spec: "Don't allow every staff member to immediately publish."
        if (!isFullAdmin && (status === 'APPROVED' || status === 'PUBLISHED')) {
            status = 'IN_REVIEW';
        }

        const igRaw = cap(body.instagramUrl, 300);
        if (subtype === 'VIDEO' && igRaw && !INSTAGRAM_RE.test(igRaw)) {
            throw new Error('Instagram URL must look like https://www.instagram.com/reel/XXXX/');
        }
        if (subtype === 'VIDEO') {
            let effectiveVideo = videoUrl;
            if (effectiveVideo === undefined) {
                effectiveVideo = isCreate ? null : ((await prisma.content.findUnique({ where: { id }, select: { videoUrl: true } }))?.videoUrl ?? null);
            }
            if (!effectiveVideo && !igRaw) {
                throw new Error('A video needs either an uploaded clip or an Instagram URL.');
            }
        }
        if (subtype === 'AUDIO') {
            let effectiveAudio = audioUrl;
            if (effectiveAudio === undefined) {
                effectiveAudio = isCreate ? null : ((await prisma.content.findUnique({ where: { id }, select: { audioUrl: true } }))?.audioUrl ?? null);
            }
            if (!effectiveAudio) throw new Error('Audio content needs an uploaded audio file.');
        }

        const relatedContentId = cap(body.relatedContentId, 40) || null;
        if (relatedContentId && relatedContentId === id) throw new Error('Content cannot relate to itself.');

        const schedRaw = body.scheduledAt ? new Date(String(body.scheduledAt)) : null;
        const scheduledAt = schedRaw && !Number.isNaN(+schedRaw) && schedRaw > new Date() ? schedRaw : null;
        // A schedule can only be set on an already-approved item — it just
        // waits for the publish-scheduled cron, it doesn't skip review.
        if (scheduledAt && status !== 'PUBLISHED') status = isFullAdmin ? 'APPROVED' : 'IN_REVIEW';

        const expRaw = body.expiresAt ? new Date(String(body.expiresAt)) : null;
        const expiresAt = expRaw && !Number.isNaN(+expRaw) ? expRaw : null;

        const titleCapped = cap(body.title || 'Untitled', 200);
        const explicitSlug = cap(body.slug, 200);
        const wantsSlug = subtype === 'ARTICLE' || subtype === 'FOUNDER_MESSAGE';

        const common = {
            type: subtype,
            status,
            scheduledAt,
            expiresAt,
            important: body.important === true || body.important === 'true',
            featured: body.featured === true || body.featured === 'true',
            audience: toAudience(body.audience),
            access: toContentAccess(body.access),
            mediaUrls: toMediaUrls(body.mediaUrls),
            category: toContentCategory(body.category),
            title: titleCapped,
            excerpt: cap(body.excerpt, 500) || null,
            body: cap(body.body, 100_000) || null,
            caption: cap(body.caption, 300) || null,
            steps: cap(body.steps, 20_000) || null,
            instagramUrl: igRaw || null,
            durationMin: has('durationMin') && body.durationMin !== '' ? Math.max(0, Math.min(180, Math.trunc(Number(body.durationMin) || 0))) : null,
            difficulty: toContentDifficulty(body.difficulty),
            language: cap(body.language, 40) || 'English',
            ctaType: isCtaType(body.ctaType) ? String(body.ctaType) : 'none',
            ctaLabel: cap(body.ctaLabel, 60) || null,
            relatedContentId,
            relatedClassBatchId: cap(body.relatedClassBatchId, 40) || null,
            metaTitle: cap(body.metaTitle, 70) || null,
            metaDescription: cap(body.metaDescription, 160) || null,
            author: cap(body.author || 'Shakti Yoga', 120),
            tags: toTags(body.tags),
            pinned: body.pinned === true || body.pinned === 'true',
            notifyOnPublish: body.notifyOnPublish === true || body.notifyOnPublish === 'true',
        };

        if (isCreate) {
            const slug = wantsSlug || explicitSlug ? await uniqueSlug(explicitSlug || slugify(titleCapped), undefined) : null;
            const created = await prisma.content.create({
                data: {
                    ...common,
                    slug,
                    createdByUserId: admin.id,
                    submittedByUserId: status === 'IN_REVIEW' ? admin.id : null,
                    submittedForReviewAt: status === 'IN_REVIEW' ? new Date() : null,
                    approvedByUserId: status === 'APPROVED' || status === 'PUBLISHED' ? admin.id : null,
                    approvedAt: status === 'APPROVED' || status === 'PUBLISHED' ? new Date() : null,
                    publishedAt: status === 'PUBLISHED' ? new Date() : null,
                    ...(imageUrl !== undefined ? { imageUrl } : {}),
                    ...(videoUrl !== undefined ? { videoUrl } : {}),
                    ...(audioUrl !== undefined ? { audioUrl } : {}),
                },
            });
            if (created.status === 'PUBLISHED') void notifyContentPublished(created.id);
            return created;
        }

        await snapshotVersion(id!, admin.id);
        const current = await prisma.content.findUnique({ where: { id }, select: { publishedAt: true, status: true, slug: true } });
        const data: Record<string, unknown> = { ...common };
        if (imageUrl !== undefined) data.imageUrl = imageUrl;
        if (videoUrl !== undefined) data.videoUrl = videoUrl;
        if (audioUrl !== undefined) data.audioUrl = audioUrl;
        if ((wantsSlug || explicitSlug) && !current?.slug) data.slug = await uniqueSlug(explicitSlug || slugify(titleCapped), id);
        else if (explicitSlug) data.slug = await uniqueSlug(slugify(explicitSlug), id);

        if (status === 'IN_REVIEW' && current?.status !== 'IN_REVIEW') {
            data.submittedByUserId = admin.id;
            data.submittedForReviewAt = new Date();
        }
        if (status === 'APPROVED' && current?.status !== 'APPROVED') {
            data.reviewedByUserId = admin.id;
            data.reviewedAt = new Date();
            data.approvedByUserId = admin.id;
            data.approvedAt = new Date();
        }
        if (status === 'PUBLISHED' && !current?.publishedAt) data.publishedAt = new Date();
        if (status !== 'PUBLISHED') data.publishedAt = null;

        const updated = await prisma.content.update({ where: { id }, data });
        if (updated.status === 'PUBLISHED') void notifyContentPublished(updated.id);
        return updated;
    }

    // whatsapp
    const roleRaw = cap(body.role || 'MEMBER_EVERYDAY', 40).toUpperCase().replace(/ /g, '_');
    const data = {
        name: cap(body.name || 'Group', 120),
        link: cap(body.link || body.whatsappLink, 500),
        role: (roleRaw in Role ? roleRaw : 'MEMBER_EVERYDAY') as Role,
        pinnedMessage: cap(body.pinnedMessage, 2000) || null,
        active: body.active === undefined ? true : Boolean(body.active),
    };
    return isCreate ? prisma.whatsAppGroup.create({ data }) : prisma.whatsAppGroup.update({ where: { id }, data });
}

function getType(request: Request): ResourceType | null {
    const t = new URL(request.url).searchParams.get('type');
    return t === 'story' || t === 'whatsapp' || t === 'content' ? t : null;
}

export async function POST(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    const type = getType(request);
    if (!type) return NextResponse.json({ error: 'Missing ?type=story|whatsapp|content' }, { status: 400 });
    try {
        const isFullAdmin = !!(await requireAdmin());
        const body = await request.json().catch(() => ({}));
        const created = await upsertContent(type, body, true, admin, isFullAdmin);
        await auditAs(admin, request)({ action: `${type}.create`, entity: type, entityId: created.id });
        return NextResponse.json({ id: created.id });
    } catch (error) {
        console.error('Admin content POST error:', error);
        const message = error instanceof Error && error.message.length < 200 ? error.message : 'Could not create content';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    const type = getType(request);
    if (!type) return NextResponse.json({ error: 'Missing ?type=story|whatsapp|content' }, { status: 400 });
    try {
        const isFullAdmin = !!(await requireAdmin());
        const body = await request.json().catch(() => ({}));
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        const updated = await upsertContent(type, body, false, admin, isFullAdmin);
        await auditAs(admin, request)({ action: `${type}.update`, entity: type, entityId: updated.id, after: { status: body.status } });
        return NextResponse.json({ id: updated.id });
    } catch (error) {
        console.error('Admin content PATCH error:', error);
        const message = error instanceof Error && error.message.length < 200 ? error.message : 'Could not update content';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    const url = new URL(request.url);
    const type = getType(request);
    const id = url.searchParams.get('id');
    if (!type || !id) return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    try {
        if (type === 'content') {
            const row = await prisma.content.findUnique({ where: { id }, select: { status: true, imageUrl: true, videoUrl: true, audioUrl: true, mediaUrls: true } });
            if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
            // Archive instead of delete for anything that's ever been public —
            // preserves engagement history, comments and analytics. A hard
            // delete of published/archived content needs a super admin.
            if (row.status !== 'DRAFT' && row.status !== 'ARCHIVED') {
                await auditAs(admin, request)({ action: 'content.archive', entity: type, entityId: id });
                await prisma.content.update({ where: { id }, data: { status: 'ARCHIVED', publishedAt: null } });
                return NextResponse.json({ success: true, archived: true });
            }
            if (row.status === 'ARCHIVED' && !(await requireAdmin())) {
                return NextResponse.json({ error: 'Only a full admin can permanently delete archived content.' }, { status: 403 });
            }
            await auditAs(admin, request)({ action: `${type}.delete`, entity: type, entityId: id });
            await prisma.content.delete({ where: { id } });
            for (const u of [row.imageUrl, row.videoUrl, row.audioUrl, ...(row.mediaUrls ?? [])]) {
                if (u) await deleteFile(u).catch(() => {});
            }
            return NextResponse.json({ success: true });
        }
        await auditAs(admin, request)({ action: `${type}.delete`, entity: type, entityId: id });
        if (type === 'story') await prisma.story.delete({ where: { id } });
        else await prisma.whatsAppGroup.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin content DELETE error:', error);
        return NextResponse.json({ error: 'Could not delete content' }, { status: 500 });
    }
}
