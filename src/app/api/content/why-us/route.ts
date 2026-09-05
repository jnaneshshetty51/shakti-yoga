import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fallback benefits for when DB is unavailable
const FALLBACK_BENEFITS = [
    {
        id: 'fallback-1',
        icon: '🕉️',
        title: 'Authentic Lineage',
        description: 'Rooted in traditional Hatha and Ashtanga yoga, passed down through experienced gurus.'
    },
    {
        id: 'fallback-2',
        icon: '🌍',
        title: 'Global Community',
        description: 'Join hundreds of NRIs and students from across the globe finding balance together.'
    },
    {
        id: 'fallback-3',
        icon: '🧘',
        title: 'Therapeutic Focus',
        description: 'Specialized attention to physical and mental health through personalized therapy plans.'
    }
];

export async function GET() {
    try {
        const benefits = await prisma.whyUsBenefit.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: { sortOrder: 'asc' }
        });

        return NextResponse.json(benefits.length > 0 ? benefits : FALLBACK_BENEFITS);
    } catch (error) {
        console.error('Error fetching benefits:', error);
        return NextResponse.json(FALLBACK_BENEFITS);
    }
}