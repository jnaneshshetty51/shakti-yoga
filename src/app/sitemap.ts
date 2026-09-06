import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

const STATIC_PATHS: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '', priority: 1, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/programs', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/everyday-yoga', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/yoga-therapy', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/yoga-therapy/start', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/trial', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/stories', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/blog', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/contact', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/disclaimer', priority: 0.2, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();
    const base: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
        url: `${SITE_URL}${p.path}`,
        lastModified: now,
        changeFrequency: p.changeFrequency,
        priority: p.priority,
    }));

    try {
        const posts = await prisma.blogPost.findMany({
            where: { status: 'PUBLISHED' },
            select: { slug: true, updatedAt: true, publishedAt: true },
        });
        for (const post of posts) {
            base.push({
                url: `${SITE_URL}/blog/${post.slug}`,
                lastModified: post.updatedAt ?? post.publishedAt ?? now,
                changeFrequency: 'monthly',
                priority: 0.5,
            });
        }
    } catch {
        // DB unavailable — ship the static map, ISR refreshes it.
    }

    return base;
}
