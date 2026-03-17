import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { createDailyRoom } from '@/lib/daily';

export async function GET() {
    try {
        const liveClasses = await prisma.liveClass.findMany({
            where: {
                status: { in: ['SCHEDULED', 'LIVE'] }
            },
            include: {
                teacher: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                _count: {
                    select: { participants: true }
                }
            },
            orderBy: { scheduledAt: 'asc' }
        });

        return NextResponse.json({ liveClasses });
    } catch (error) {
        console.error('Live classes API error:', error);
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
        if (!payload || (payload.role !== 'admin' && payload.role !== 'teacher')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { title, description, scheduledAt, teacherId } = body;

        if (!title || !scheduledAt || !teacherId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create Daily.co room
        const dailyRoom = await createDailyRoom(title);

        const liveClass = await prisma.liveClass.create({
            data: {
                title,
                description,
                scheduledAt: new Date(scheduledAt),
                teacherId,
                roomUrl: dailyRoom.url,
                roomId: dailyRoom.name,
            },
            include: {
                teacher: {
                    select: { name: true }
                }
            }
        });

        return NextResponse.json({ liveClass });
    } catch (error) {
        console.error('Create live class error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
