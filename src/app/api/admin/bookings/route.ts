import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { cancelBooking } from '@/lib/booking';
import { sendEmail, emailLayout } from '@/lib/email';
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
            meetingLink: booking.meetingLink ?? '',
            notes: booking.notes ?? '',
        }));

        return NextResponse.json({ bookings: formattedBookings });
    } catch (error) {
        console.error('Admin bookings API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    try {
        const { id, status, notes, meetingLink } = await request.json().catch(() => ({}));
        if (!id) return NextResponse.json({ error: 'Missing booking id' }, { status: 400 });
        if (status && !(status in BookingStatus)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const before = await prisma.booking.findUnique({
            where: { id },
            include: { user: { select: { email: true, name: true } } },
        });
        if (!before) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

        // A staff cancel always refunds the credit (via the shared helper).
        let creditsRestored = 0;
        if (status === 'CANCELLED' && (before.status === 'PENDING' || before.status === 'CONFIRMED')) {
            const r = await cancelBooking(id, { actorUserId: admin.id, byStaff: true });
            if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
            creditsRestored = r.creditsRestored ?? 0;
            sendEmail({
                to: before.user.email,
                subject: 'Your Shakti Yoga session was cancelled',
                html: emailLayout(
                    `<p>Hi ${before.user.name.split(' ')[0] || 'there'},</p>
                     <p>We've had to cancel your session on ${before.date.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} IST.</p>
                     ${creditsRestored ? '<p>Your session credit has been returned — please rebook a time that works for you.</p>' : ''}`,
                ),
            }).catch(() => { });
        }

        const data: Record<string, unknown> = {};
        if (status && status !== 'CANCELLED') data.status = status as BookingStatus;
        if (notes !== undefined) data.notes = notes || null;
        if (meetingLink !== undefined) data.meetingLink = (meetingLink as string)?.trim() || null;

        const booking = Object.keys(data).length
            ? await prisma.booking.update({ where: { id }, data })
            : await prisma.booking.findUniqueOrThrow({ where: { id } });

        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: status === 'CANCELLED' ? 'booking.cancel' : 'booking.update',
            entity: 'Booking', entityId: id,
            before: { status: before.status, notes: before.notes, meetingLink: before.meetingLink },
            after: { status: booking.status, notes: booking.notes, meetingLink: booking.meetingLink, creditsRestored },
        });

        return NextResponse.json({ booking: { id: booking.id, status: booking.status }, creditsRestored });
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
    return new Intl.DateTimeFormat('en-IN', {
        month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata',
    }).format(date);
}

function formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
        hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    }).format(date);
}

