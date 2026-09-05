import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/admin-auth';
import { BookingStatus } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || payload.role !== 'admin') {
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

export async function PATCH(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    try {
        const { id, status, notes } = await request.json().catch(() => ({}));
        if (!id) return NextResponse.json({ error: 'Missing booking id' }, { status: 400 });
        if (status && !(status in BookingStatus)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
        const data: Record<string, unknown> = {};
        if (status) data.status = status as BookingStatus;
        if (notes !== undefined) data.notes = notes || null;
        const booking = await prisma.booking.update({ where: { id }, data });
        return NextResponse.json({ booking: { id: booking.id, status: booking.status } });
    } catch (error) {
        console.error('Admin bookings PATCH error:', error);
        return NextResponse.json({ error: 'Could not update booking' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    try {
        const id = new URL(request.url).searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing booking id' }, { status: 400 });
        await prisma.booking.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin bookings DELETE error:', error);
        return NextResponse.json({ error: 'Could not delete booking' }, { status: 500 });
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

