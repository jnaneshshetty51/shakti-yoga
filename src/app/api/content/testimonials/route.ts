import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fallback testimonials for when DB is unavailable
const FALLBACK_TESTIMONIALS = [
    {
        id: 'fallback-1',
        authorName: 'Priya Sharma',
        location: 'London, UK',
        planType: 'NRI',
        quote: "I never thought online yoga could be this effective. My back pain is gone after 3 months of therapy.",
        rating: 5
    },
    {
        id: 'fallback-2',
        authorName: 'Rahul Mehta',
        location: 'California, USA',
        planType: 'Everyday Yoga',
        quote: "The everyday classes help me stay grounded despite my hectic work schedule. It's my daily sanctuary.",
        rating: 5
    },
    {
        id: 'fallback-3',
        authorName: 'Sarah Jenkins',
        location: 'Dubai, UAE',
        planType: 'NRI',
        quote: "Authentic, traditional, yet so accessible. The teachers really care about your progress.",
        rating: 4
    }
];

export async function GET() {
    try {
        const stories = await prisma.story.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        const testimonials = stories.map(story => ({
            id: story.id,
            authorName: story.authorName,
            location: story.location,
            planType: story.planType,
            quote: story.quote,
            rating: story.rating,
            imageUrl: story.imageUrl
        }));

        return NextResponse.json(testimonials.length > 0 ? testimonials : FALLBACK_TESTIMONIALS);
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        return NextResponse.json(FALLBACK_TESTIMONIALS);
    }
}