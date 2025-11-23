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

        const bookings = await prisma.booking.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                teacher: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
        });

        const formattedBookings = bookings.map(booking => ({
            id: booking.id,
            userId: booking.userId,
            userName: booking.user.name,
            type: booking.type === 'THERAPY_SESSION' ? 'Therapy' :
                  booking.type === 'CONSULTATION' ? 'Consultation' : 'Special Session',
            date: formatDate(booking.date),
            time: formatTime(booking.date),
            status: booking.status === 'CONFIRMED' ? 'Confirmed' :
                    booking.status === 'PENDING' ? 'Pending' :
                    booking.status === 'COMPLETED' ? 'Completed' : 'Cancelled',
            teacher: booking.teacher.name,
        }));

        return NextResponse.json({ bookings: formattedBookings });
    } catch (error) {
        console.error('Admin bookings API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    }).format(date);
}

function formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    }).format(date);
}

