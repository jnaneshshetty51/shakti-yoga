import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || (payload.role !== 'SUPER_ADMIN' && payload.role !== 'STAFF_ADMIN')) {
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
            location: story.location || 'N/A',
            plan: story.planType || 'N/A',
            rating: story.rating,
            quote: story.quote,
        }));

        const formattedBlogPosts = blogPosts.map(post => ({
            id: post.id,
            title: post.title,
            category: post.category,
            date: formatDate(post.publishedAt || post.createdAt),
            slug: post.slug,
        }));

        const formattedGroups = groups.map(group => ({
            id: group.id,
            name: group.name,
            role: group.role.replace('_', ' ').toLowerCase(),
            whatsappLink: group.link,
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

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    }).format(date);
}

