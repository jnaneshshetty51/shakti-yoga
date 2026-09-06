import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/admin-auth';
import { Role, ContentStatus } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });
type ContentType = 'story' | 'blog' | 'whatsapp';

function toContentStatus(v: unknown): ContentStatus {
    const s = String(v || '').toUpperCase();
    return s in ContentStatus ? (s as ContentStatus) : ContentStatus.DRAFT;
}

function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const [stories, blogPosts, groups] = await Promise.all([
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
        }));

        const formattedGroups = groups.map(group => ({
            id: group.id,
            name: group.name,
            role: group.role,
            whatsappLink: group.link,
            pinnedMessage: group.pinnedMessage || '',
        }));

        return NextResponse.json({
            stories: formattedStories,
            blogPosts: formattedBlogPosts,
            groups: formattedGroups,
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

    if (type === 'story') {
        const data = {
            authorName: cap(body.authorName || body.name || 'Anonymous', 120),
            location: cap(body.location, 120) || null,
            planType: cap(body.planType, 60) || null,
            quote: cap(body.quote, 600),
            content: cap(body.content, 5000) || null,
            rating: Math.min(5, Math.max(1, Math.trunc(Number(body.rating) || 5))),
            status: toContentStatus(body.status ?? 'PUBLISHED'),
        };
        return isCreate
            ? prisma.story.create({ data })
            : prisma.story.update({ where: { id }, data });
    }

    if (type === 'blog') {
        const title = cap(body.title || 'Untitled', 200);
        const data = {
            title,
            slug: cap(body.slug, 200) || slugify(title),
            excerpt: cap(body.excerpt, 500) || null,
            content: cap(body.content, 100_000),
            category: cap(body.category || 'General', 80),
            author: cap(body.author || 'Shakti Yoga', 120),
            status: toContentStatus(body.status),
            publishedAt: body.status === 'PUBLISHED' ? new Date() : null,
        };
        return isCreate
            ? prisma.blogPost.create({ data })
            : prisma.blogPost.update({ where: { id }, data });
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
    return t === 'story' || t === 'blog' || t === 'whatsapp' ? t : null;
}

export async function POST(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    const type = getType(request);
    if (!type) return NextResponse.json({ error: 'Missing ?type=story|blog|whatsapp' }, { status: 400 });
    try {
        const body = await request.json().catch(() => ({}));
        const created = await upsertContent(type, body, true);
        return NextResponse.json({ id: created.id });
    } catch (error) {
        console.error('Admin content POST error:', error);
        return NextResponse.json({ error: 'Could not create content' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    const type = getType(request);
    if (!type) return NextResponse.json({ error: 'Missing ?type=story|blog|whatsapp' }, { status: 400 });
    try {
        const body = await request.json().catch(() => ({}));
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        const updated = await upsertContent(type, body, false);
        return NextResponse.json({ id: updated.id });
    } catch (error) {
        console.error('Admin content PATCH error:', error);
        return NextResponse.json({ error: 'Could not update content' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    const url = new URL(request.url);
    const type = getType(request);
    const id = url.searchParams.get('id');
    if (!type || !id) return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    try {
        if (type === 'story') await prisma.story.delete({ where: { id } });
        else if (type === 'blog') await prisma.blogPost.delete({ where: { id } });
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

