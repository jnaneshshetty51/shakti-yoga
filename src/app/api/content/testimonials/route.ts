import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

        // No invented fallback here — an empty list is an honest "no published
        // stories yet," unlike three fabricated named customers that used to
        // stand in for real testimonials with no disclosure.
        return NextResponse.json(testimonials);
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        return NextResponse.json({ error: 'Could not load testimonials' }, { status: 500 });
    }
}