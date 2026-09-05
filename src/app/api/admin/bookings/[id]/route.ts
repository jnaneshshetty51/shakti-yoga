import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || (payload.role !== 'admin' && payload.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // We can either soft-delete (status = 'CANCELLED') or hard delete. Let's do a hard delete or update status.
        // Usually bookings are just cancelled, but if a user clicks delete, we delete it.
        await prisma.booking.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Failed to delete booking:', error);
        return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
    }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
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
        const { status, date, time } = body;

        const updateData: Record<string, unknown> = {};
        if (status) {
            // Map frontend statuses to DB enum if necessary
            const statusMap: Record<string, string> = {
                'Confirmed': 'CONFIRMED',
                'Pending': 'PENDING',
                'Completed': 'COMPLETED',
                'Cancelled': 'CANCELLED'
            };
            updateData.status = statusMap[status] || status;
        }

        if (date && time) {
            updateData.date = new Date(`${date}T${time}:00`);
        }

        const updatedBooking = await prisma.booking.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({
            success: true,
            message: 'Booking updated successfully',
            booking: updatedBooking
        });
    } catch (error) {
        console.error('Failed to update booking:', error);
        return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    }
}
