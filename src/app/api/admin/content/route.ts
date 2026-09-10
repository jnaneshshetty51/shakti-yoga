import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { toStorageKey, mediaSrc, deleteFile } from '@/lib/storage';
import { Role, ContentStatus, ContentType as ContentSubtype } from '@prisma/client';
import { isCtaType, toContentCategory, serializeContent } from '@/lib/content';
import { notifyContentPublished } from '@/lib/content-notify';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });
type ContentType = 'story' | 'blog' | 'whatsapp' | 'content';

const INSTAGRAM_RE = /^https:\/\/(www\.)?instagram\.com\/(reel|p|tv)\/[A-Za-z0-9_-]+\/?/i;

function toSubtype(v: unknown): ContentSubtype {
    const s = String(v || '').toUpperCase();
    return s in ContentSubtype ? (s as ContentSubtype) : ContentSubtype.POST;
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

export async function GET() {
    try {
        const payload = await requireDepartment('CONTENT');
        if (!payload) return forbidden();

        const [stories, blogPosts, groups, contentRows, classBatches] = await Promise.all([
            prisma.story.findMany({
                include: {
                    user: {
                        select: {
                            name: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            prisma.blogPost.findMany({
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            prisma.whatsAppGroup.findMany({
                where: {
                    active: true,
                },
            }),
            prisma.content.findMany({
                orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
            }),
            prisma.classBatch.findMany({
                where: { active: true },
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
        ]);

        const formattedStories = stories.map(story => ({
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

        const formattedBlogPosts = blogPosts.map(post => ({
            id: post.id,
            title: post.title,
            category: post.category,
            date: formatDate(post.publishedAt || post.createdAt),
            slug: post.slug,
            excerpt: post.excerpt || '',
            content: post.content,
            author: post.author,
            status: post.status,
            imageUrl: post.imageUrl || '',
            ctaType: post.ctaType || 'none',
            ctaLabel: post.ctaLabel || '',
            relatedClassBatchId: post.relatedClassBatchId || '',
        }));

        const formattedGroups = groups.map(group => ({
            id: group.id,
            name: group.name,
            role: group.role,
            whatsappLink: group.link,
            pinnedMessage: group.pinnedMessage || '',
        }));

        const content = contentRows.map((row) => {
            const item = serializeContent(row);
            return {
                ...item,
                id: row.id,
                contentType: row.type,
                status: row.status,
                category: row.category,
                title: row.title,
                body: row.body || '',
                caption: row.caption || '',
                instagramUrl: row.instagramUrl || '',
                imageUrl: row.imageUrl || '',
                ctaType: row.ctaType || 'none',
                ctaLabel: row.ctaLabel || '',
                relatedBlogId: row.relatedBlogId || '',
                author: row.author,
                tags: row.tags.join(', '),
                pinned: row.pinned,
                important: row.important,
                audience: row.audience.join(', '),
                mediaUrls: row.mediaUrls.join('\n'),
                expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
                notifyOnPublish: row.notifyOnPublish,
                publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
                scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
            };
        });

        return NextResponse.json({
            stories: formattedStories,
            blogPosts: formattedBlogPosts,
            groups: formattedGroups,
            content,
            blogOptions: blogPosts.map((b) => ({ label: b.title, value: b.id })),
            classBatchOptions: classBatches.map((b) => ({ label: b.name, value: b.id })),
            counts: {
                drafts: contentRows.filter((r) => r.status === 'DRAFT').length,
                published: contentRows.filter((r) => r.status === 'PUBLISHED').length,
                scheduled: contentRows.filter((r) => r.status !== 'PUBLISHED' && r.scheduledAt && r.scheduledAt > new Date()).length,
            },
        });
    } catch (error) {
        console.error('Admin content API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/** Coerce to a trimmed string with a hard length cap; '' -> null upstream. */
function cap(v: unknown, max: number): string {
    const s = typeof v === 'string' ? v : v == null ? '' : String(v);
    return s.slice(0, max).trim();
}

async function upsertContent(type: ContentType, body: Record<string, unknown>, isCreate: boolean) {
    const id = body.id as string | undefined;

    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
    // Only accept a media path we produced (the content-image upload endpoint), or '' to clear.
    const imageUrl = has('imageUrl')
        ? (typeof body.imageUrl === 'string' && toStorageKey(body.imageUrl)
            ? mediaSrc(toStorageKey(body.imageUrl)!)
            : (body.imageUrl === '' ? null : undefined))
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
                    status: toContentStatus(body.status ?? 'PUBLISHED'),
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
        return prisma.story.update({ where: { id }, data });
    }

    if (type === 'blog') {
        if (isCreate) {
            const title = cap(body.title || 'Untitled', 200);
            const status = toContentStatus(body.status);
            return prisma.blogPost.create({
                data: {
                    title,
                    slug: cap(body.slug, 200) || slugify(title),
                    excerpt: cap(body.excerpt, 500) || null,
                    content: cap(body.content, 100_000),
                    category: cap(body.category || 'General', 80),
                    author: cap(body.author || 'Shakti Yoga', 120),
                    status,
                    publishedAt: status === 'PUBLISHED' ? new Date() : null,
                    ctaType: isCtaType(body.ctaType) && body.ctaType !== 'open_blog' ? String(body.ctaType) : null,
                    ctaLabel: cap(body.ctaLabel, 60) || null,
                    relatedClassBatchId: cap(body.relatedClassBatchId, 40) || null,
                    ...(imageUrl !== undefined ? { imageUrl } : {}),
                },
            });
        }
        const data: Record<string, unknown> = {};
        if (has('title')) data.title = cap(body.title || 'Untitled', 200);
        if (has('slug') && cap(body.slug, 200)) data.slug = slugify(cap(body.slug, 200));
        if (has('excerpt')) data.excerpt = cap(body.excerpt, 500) || null;
        if (has('content')) data.content = cap(body.content, 100_000);
        if (has('category')) data.category = cap(body.category || 'General', 80);
        if (has('author')) data.author = cap(body.author || 'Shakti Yoga', 120);
        if (has('ctaType')) data.ctaType = isCtaType(body.ctaType) && body.ctaType !== 'open_blog' ? String(body.ctaType) : null;
        if (has('ctaLabel')) data.ctaLabel = cap(body.ctaLabel, 60) || null;
        if (has('relatedClassBatchId')) data.relatedClassBatchId = cap(body.relatedClassBatchId, 40) || null;
        if (imageUrl !== undefined) data.imageUrl = imageUrl;
        if (has('status')) {
            const status = toContentStatus(body.status);
            data.status = status;
            const current = await prisma.blogPost.findUnique({ where: { id }, select: { publishedAt: true } });
            if (status === 'PUBLISHED' && !current?.publishedAt) data.publishedAt = new Date();
            if (status !== 'PUBLISHED') data.publishedAt = null;
        }
        return prisma.blogPost.update({ where: { id }, data });
    }

    if (type === 'content') {
        const subtype = toSubtype(body.contentType);
        let status = toContentStatus(body.status);
        const igRaw = cap(body.instagramUrl, 300);
        if (subtype === 'REEL' && igRaw && !INSTAGRAM_RE.test(igRaw)) {
            throw new Error('Instagram URL must look like https://www.instagram.com/reel/XXXX/');
        }
        const relatedBlogId = cap(body.relatedBlogId, 40) || null;

        // Scheduling: a future `scheduledAt` parks the item as a DRAFT until the
        // publish-scheduled cron promotes it.
        const schedRaw = body.scheduledAt ? new Date(String(body.scheduledAt)) : null;
        const scheduledAt = schedRaw && !Number.isNaN(+schedRaw) && schedRaw > new Date() ? schedRaw : null;
        if (scheduledAt) status = 'DRAFT';

        const expRaw = body.expiresAt ? new Date(String(body.expiresAt)) : null;
        const expiresAt = expRaw && !Number.isNaN(+expRaw) ? expRaw : null;

        const common = {
            type: subtype,
            status,
            scheduledAt,
            expiresAt,
            important: body.important === true || body.important === 'true',
            audience: toAudience(body.audience),
            mediaUrls: toMediaUrls(body.mediaUrls),
            category: toContentCategory(body.category),
            title: cap(body.title || 'Untitled', 200),
            body: cap(body.body, 20_000) || null,
            caption: cap(body.caption, 300) || null,
            instagramUrl: igRaw || null,
            ctaType: isCtaType(body.ctaType) ? String(body.ctaType) : 'none',
            ctaLabel: cap(body.ctaLabel, 60) || null,
            relatedBlogId,
            author: cap(body.author || 'Shakti Yoga', 120),
            tags: toTags(body.tags),
            pinned: body.pinned === true || body.pinned === 'true',
            notifyOnPublish: body.notifyOnPublish === true || body.notifyOnPublish === 'true',
        };

        if (isCreate) {
            const created = await prisma.content.create({
                data: {
                    ...common,
                    publishedAt: status === 'PUBLISHED' ? new Date() : null,
                    ...(imageUrl !== undefined ? { imageUrl } : {}),
                },
            });
            if (created.status === 'PUBLISHED') void notifyContentPublished(created.id);
            return created;
        }
        const current = await prisma.content.findUnique({ where: { id }, select: { publishedAt: true } });
        const data: Record<string, unknown> = { ...common };
        if (imageUrl !== undefined) data.imageUrl = imageUrl;
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
    return isCreate
        ? prisma.whatsAppGroup.create({ data })
        : prisma.whatsAppGroup.update({ where: { id }, data });
}

function getType(request: Request): ContentType | null {
    const t = new URL(request.url).searchParams.get('type');
    return t === 'story' || t === 'blog' || t === 'whatsapp' || t === 'content' ? t : null;
}

export async function POST(request: Request) {
    if (!(await requireDepartment('CONTENT'))) return forbidden();
    const type = getType(request);
    if (!type) return NextResponse.json({ error: 'Missing ?type=story|blog|whatsapp' }, { status: 400 });
    try {
        const body = await request.json().catch(() => ({}));
        const created = await upsertContent(type, body, true);
        return NextResponse.json({ id: created.id });
    } catch (error) {
        console.error('Admin content POST error:', error);
        const message = error instanceof Error && error.message.length < 200 ? error.message : 'Could not create content';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    if (!(await requireDepartment('CONTENT'))) return forbidden();
    const type = getType(request);
    if (!type) return NextResponse.json({ error: 'Missing ?type=story|blog|whatsapp' }, { status: 400 });
    try {
        const body = await request.json().catch(() => ({}));
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        const updated = await upsertContent(type, body, false);
        return NextResponse.json({ id: updated.id });
    } catch (error) {
        console.error('Admin content PATCH error:', error);
        const message = error instanceof Error && error.message.length < 200 ? error.message : 'Could not update content';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    if (!(await requireDepartment('CONTENT'))) return forbidden();
    const url = new URL(request.url);
    const type = getType(request);
    const id = url.searchParams.get('id');
    if (!type || !id) return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    try {
        if (type === 'story') await prisma.story.delete({ where: { id } });
        else if (type === 'blog') await prisma.blogPost.delete({ where: { id } });
        else if (type === 'content') {
            const row = await prisma.content.findUnique({ where: { id }, select: { imageUrl: true, mediaUrls: true } });
            await prisma.content.delete({ where: { id } });
            for (const url of [row?.imageUrl, ...(row?.mediaUrls ?? [])]) {
                if (url) await deleteFile(url).catch(() => {});
            }
        }
        else await prisma.whatsAppGroup.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin content DELETE error:', error);
        return NextResponse.json({ error: 'Could not delete content' }, { status: 500 });
    }
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

