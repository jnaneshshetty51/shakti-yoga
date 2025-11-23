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

        // Get upcoming class instances for the next 7 days
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        const instances = await prisma.classInstance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                batch: {
                    include: {
                        teacher: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                date: 'asc',
            },
        });

        // Group by day of week
        const scheduleByDay: Record<string, any[]> = {
            'Mon': [],
            'Tue': [],
            'Wed': [],
            'Thu': [],
            'Fri': [],
            'Sat': [],
            'Sun': [],
        };

        instances.forEach(instance => {
            const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(instance.date);
            const dayKey = dayName as keyof typeof scheduleByDay;
            
            if (scheduleByDay[dayKey]) {
                scheduleByDay[dayKey].push({
                    id: instance.id,
                    batchName: instance.batch.name,
                    timeSlot: formatTimeSlot(instance.date),
                    teacher: instance.batch.teacher.name,
                    status: instance.status,
                    attendanceCount: instance.attendanceCount,
                });
            }
        });

        // Also get all active batches for reference
        const batches = await prisma.classBatch.findMany({
            where: {
                active: true,
            },
            include: {
                teacher: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json({
            schedule: scheduleByDay,
            batches: batches.map(b => ({
                id: b.id,
                name: b.name,
                timeSlot: b.timeSlot,
                daysOfWeek: b.daysOfWeek,
                teacher: b.teacher.name,
            })),
        });
    } catch (error) {
        console.error('Admin schedule API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function formatTimeSlot(date: Date): string {
    const time = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(date);
    
    const endDate = new Date(date);
    endDate.setHours(endDate.getHours() + 1);
    const endTime = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(endDate);
    
    return `${time} - ${endTime} IST`;
}

