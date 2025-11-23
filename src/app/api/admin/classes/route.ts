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

        const batches = await prisma.classBatch.findMany({
            include: {
                teacher: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                timeSlot: 'asc',
            },
        });

        const formattedBatches = batches.map(batch => ({
            id: batch.id,
            name: batch.name,
            time: `${batch.timeSlot} IST`,
            days: batch.daysOfWeek,
            teacher: batch.teacher.name,
            active: batch.active,
        }));

        return NextResponse.json({ batches: formattedBatches });
    } catch (error) {
        console.error('Admin classes API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

