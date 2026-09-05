import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || (payload.role !== 'admin' && payload.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const dbStories = await prisma.story.findMany({
            include: {
                user: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ stories: dbStories });
    } catch (error) {
        console.error('Admin stories API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || (payload.role !== 'admin' && payload.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { authorName, quote, content, location, planType, rating, imageUrl, status, userId } = body;

        if (!authorName || !quote) {
            return NextResponse.json({ error: 'Author name and quote are required' }, { status: 400 });
        }

        const newStory = await prisma.story.create({
            data: {
                authorName,
                quote,
                content: content || undefined,
                location: location || undefined,
                planType: planType || undefined,
                rating: rating || 5,
                imageUrl: imageUrl || undefined,
                status: status ? status.toUpperCase() : 'PENDING',
                userId: userId || undefined
            },
            include: {
                user: { select: { id: true, name: true } }
            }
        });

        return NextResponse.json({ success: true, story: newStory });
    } catch (error) {
        console.error('Admin stories POST API error:', error);
        return NextResponse.json({ error: 'Failed to create story' }, { status: 500 });
    }
}
