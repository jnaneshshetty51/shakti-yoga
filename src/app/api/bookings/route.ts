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
        if (!payload) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const bookings = await prisma.booking.findMany({
            where: { userId: payload.id },
            include: {
                teacher: {
                    select: { name: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        return NextResponse.json({ bookings });
    } catch (error) {
        console.error('Bookings API error:', error);
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
        if (!payload) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Get user to check role and existing bookings
        const user = await prisma.user.findUnique({
            where: { id: payload.id },
            include: {
                bookings: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check paywall role
        if (user.role === 'VISITOR') {
            return NextResponse.json({
                error: 'Subscription required',
                message: 'You need an active subscription or free trial to book classes. Please choose a plan to continue.'
            }, { status: 403 });
        }

        // Check trial limit - trial users can only book 1 class
        if (user.role === 'TRIAL' && user.bookings.length >= 1) {
            return NextResponse.json({
                error: 'Trial limit reached',
                message: 'Trial users can only book 1 class. Please upgrade to continue.'
            }, { status: 403 });
        }

        const body = await request.json();
        const { slot, recurring } = body;

        // Get a teacher (for now, use the first teacher we find)
        const teacher = await prisma.user.findFirst({
            where: { role: 'TEACHER' }
        });

        if (!teacher) {
            return NextResponse.json({
                error: 'No teacher available',
                message: 'We could not find an available teacher for this slot. Please try again later or contact support.'
            }, { status: 404 });
        }

        // Parse slot time and create booking date
        // For now, create booking for tomorrow at the selected time
        const bookingDate = new Date();
        bookingDate.setDate(bookingDate.getDate() + 1);
        bookingDate.setHours(parseInt(slot.split(':')[0]), parseInt(slot.split(':')[1]), 0, 0);

        // Create booking
        const booking = await prisma.booking.create({
            data: {
                userId: user.id,
                teacherId: teacher.id,
                type: user.role === 'MEMBER_THERAPY' ? 'THERAPY_SESSION' : 'CONSULTATION',
                status: 'CONFIRMED',
                date: bookingDate,
                notes: recurring ? 'Recurring booking requested' : null
            }
        });

        return NextResponse.json({
            success: true,
            booking,
            message: 'Booking confirmed!'
        });
    } catch (error) {
        console.error('Create booking error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
