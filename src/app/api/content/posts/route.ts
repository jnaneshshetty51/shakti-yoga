import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fallback blog posts for when DB is unavailable
const FALLBACK_BLOG_POSTS = [
    {
        id: 'post_1',
        slug: 'yoga-for-back-pain',
        title: '5 Asanas to Relieve Lower Back Pain',
        excerpt: 'Discover gentle yoga poses that can help alleviate chronic back pain and improve spinal health.',
        category: 'Health',
        date: 'Nov 15, 2025'
    },
    {
        id: 'post_2',
        slug: 'travel-stress-relief',
        title: 'Yoga for Travel Stress & Jet Lag',
        excerpt: 'Simple breathing techniques and stretches to keep you grounded while traveling.',
        category: 'Travel',
        date: 'Nov 10, 2025'
    },
    {
        id: 'post_3',
        slug: 'mindfulness-at-work',
        title: 'Integrating Mindfulness into Your Work Day',
        excerpt: 'Small practices to stay focused and calm during a busy work day.',
        category: 'Mindfulness',
        date: 'Nov 05, 2025'
    }
];

export async function GET() {
    try {
        const posts = await prisma.blogPost.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: { publishedAt: 'desc' },
            select: {
                id: true,
                slug: true,
                title: true,
                excerpt: true,
                category: true,
                publishedAt: true
            }
        });

        const formattedPosts = posts.map(post => ({
            id: post.id,
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt || '',
            category: post.category,
            date: post.publishedAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        }));

        return NextResponse.json(formattedPosts.length > 0 ? formattedPosts : FALLBACK_BLOG_POSTS);
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        return NextResponse.json(FALLBACK_BLOG_POSTS);
    }
}