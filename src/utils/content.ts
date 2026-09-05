/**
 * @deprecated This file contains deprecated hardcoded data.
 * All content should now be fetched from API routes:
 * - Testimonials: GET /api/content/testimonials
 * - FAQs: GET /api/content/faqs
 * - Programs: GET /api/content/programs
 * - Stats: GET /api/content/stats
 * - Why Us Benefits: GET /api/content/why-us
 * 
 * This file is kept for type definitions only.
 */

export type Story = {
    id: string;
    name: string;
    location: string;
    plan: string; // 'Everyday Yoga', 'Therapy', 'NRI'
    quote: string;
    beforeAfter?: string;
    rating: number;
    image?: string; // Placeholder for now
};

export type BlogPost = {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    category: string;
    date: string;
    image?: string;
};

/**
 * @deprecated Use API route /api/content/testimonials instead
 */
export const stories: Story[] = [];

/**
 * @deprecated Use API route /api/content/programs instead
 */
export const blogPosts: BlogPost[] = [];
