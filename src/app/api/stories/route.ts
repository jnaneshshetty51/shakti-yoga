import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 300;

export async function GET() {
    try {
        const stories = await prisma.story.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true } } },
        });

        return NextResponse.json({
            stories: stories.map(s => ({
                id: s.id,
                name: s.user?.name || s.authorName,
                location: s.location || '',
                plan: s.planType || '',
                quote: s.quote,
                content: s.content || '',
                rating: s.rating,
                imageUrl: s.imageUrl || null,
            })),
        });
    } catch (error) {
        console.error('Stories API error:', error);
        return NextResponse.json({ stories: [] });
    }
}
