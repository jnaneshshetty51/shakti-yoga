import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { cancelBooking, bookingInstant } from '@/lib/booking';
import { sendEmail, emailLayout } from '@/lib/email';
import { sendPush } from '@/lib/push';
import { BookingStatus, BookingType } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** Accept either an ISO datetime or a "YYYY-MM-DD" + "HH:MM" IST pair. */
function resolveWhen(body: { date?: string; dateStr?: string; slot?: string }): Date | null {
    if (body.dateStr && body.slot) {
        try { return bookingInstant(body.dateStr, body.slot); } catch { return null; }
    }
    if (body.date) {
        const d = new Date(body.date);
        return Number.isNaN(+d) ? null : d;
    }
    return null;
}

export async function GET() {
    try {
        const payload = await requireDepartment(['THERAPIST']);
        if (!payload) return forbidden();

        const [bookings, teachers] = await Promise.all([
            prisma.booking.findMany({
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    teacher: { select: { id: true, name: true } },
                },
                orderBy: { date: 'desc' },
            }),
            prisma.user.findMany({ where: { role: 'TEACHER' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        ]);

        const formattedBookings = bookings.map((booking) => ({
            id: booking.id,
            userId: booking.userId,
            userName: booking.user.name,
            userEmail: booking.user.email,
            type: booking.type === 'THERAPY_SESSION' ? 'Therapy' :
                booking.type === 'CONSULTATION' ? 'Consultation' : 'Special Session',
            rawType: booking.type,
            date: formatDate(booking.date),
            time: formatTime(booking.date),
            dateISO: booking.date.toISOString(),
            status: booking.status === 'CONFIRMED' ? 'Confirmed' :
                booking.status === 'PENDING' ? 'Pending' :
                    booking.status === 'COMPLETED' ? 'Completed' :
                        booking.status === 'NO_SHOW' ? 'No-show' : 'Cancelled',
            rawStatus: booking.status,
            teacher: booking.teacher.name,
            teacherId: booking.teacherId,
            meetingLink: booking.meetingLink ?? '',
            notes: booking.notes ?? '',
        }));

        return NextResponse.json({ bookings: formattedBookings, teachers });
    } catch (error) {
        console.error('Admin bookings API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/** POST — create a booking on a member's behalf. */
export async function POST(request: Request) {
    const admin = await requireDepartment(['THERAPIST']);
    if (!admin) return forbidden();
    try {
        const body = await request.json().catch(() => ({}));
        const email = String(body.email || '').trim().toLowerCase();
        const teacherId = String(body.teacherId || '');
        const typeRaw = String(body.type || 'THERAPY_SESSION').toUpperCase();
        const type = typeRaw in BookingType ? (typeRaw as BookingType) : BookingType.THERAPY_SESSION;
        const chargeCredit = body.chargeCredit === true;
        const when = resolveWhen(body);

        const user = await prisma.user.findUnique({ where: { email }, select: { id: true, credits: true } });
        if (!user) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
        const teacher = await prisma.user.findFirst({ where: { id: teacherId, role: 'TEACHER' }, select: { id: true } });
        if (!teacher) return NextResponse.json({ error: 'Pick a teacher.' }, { status: 400 });
        if (!when) return NextResponse.json({ error: 'Pick a valid date and time.' }, { status: 400 });

        const booking = await prisma.$transaction(async (tx) => {
            if (chargeCredit && type === BookingType.THERAPY_SESSION) {
                const debit = await tx.user.updateMany({ where: { id: user.id, credits: { gt: 0 } }, data: { credits: { decrement: 1 } } });
                if (debit.count === 0) throw new Error('Member has no 1:1 credits — untick "charge a credit" or top up first.');
            }
            return tx.booking.create({
                data: { userId: user.id, teacherId, type, status: BookingStatus.CONFIRMED, date: when, notes: body.notes ? String(body.notes).slice(0, 1000) : null },
            });
        });

        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'booking.create', entity: 'Booking', entityId: booking.id,
            after: { userId: user.id, teacherId, type, date: when.toISOString(), chargeCredit },
        });
        sendPush(user.id, {
            title: 'A session was scheduled for you',
            body: `${when.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} IST`,
            url: '/dashboard/therapy/book', channelId: 'sessions',
        }).catch(() => {});

        return NextResponse.json({ id: booking.id });
    } catch (error) {
        const message = error instanceof Error && error.message.length < 200 ? error.message : 'Could not create the booking.';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    const admin = await requireDepartment(['THERAPIST']);
    if (!admin) return forbidden();
    try {
        const body = await request.json().catch(() => ({}));
        const { id, status, notes, meetingLink, teacherId } = body;
        if (!id) return NextResponse.json({ error: 'Missing booking id' }, { status: 400 });
        if (status && !(status in BookingStatus)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
        const newWhen = (body.date || (body.dateStr && body.slot)) ? resolveWhen(body) : null;
        if ((body.date || body.slot) && !newWhen) {
            return NextResponse.json({ error: 'Invalid reschedule date.' }, { status: 400 });
        }
        if (teacherId) {
            const t = await prisma.user.findFirst({ where: { id: String(teacherId), role: 'TEACHER' }, select: { id: true } });
            if (!t) return NextResponse.json({ error: 'Unknown teacher.' }, { status: 400 });
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
        if (newWhen) data.date = newWhen;
        if (teacherId && teacherId !== before.teacherId) data.teacherId = String(teacherId);

        const booking = Object.keys(data).length
            ? await prisma.booking.update({ where: { id }, data })
            : await prisma.booking.findUniqueOrThrow({ where: { id } });

        const rescheduled = Boolean(newWhen && +newWhen !== +before.date);
        const reassigned = Boolean(data.teacherId);
        if ((rescheduled || reassigned) && (before.status === 'PENDING' || before.status === 'CONFIRMED')) {
            sendPush(before.userId, {
                title: reassigned && !rescheduled ? 'Your session teacher changed' : 'Your session was rescheduled',
                body: rescheduled
                    ? `Now ${booking.date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} IST`
                    : 'Open the app for the updated details.',
                url: '/dashboard/therapy/book', channelId: 'sessions',
            }).catch(() => {});
        }

        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: status === 'CANCELLED' ? 'booking.cancel' : rescheduled ? 'booking.reschedule' : reassigned ? 'booking.reassign' : 'booking.update',
            entity: 'Booking', entityId: id,
            before: { status: before.status, notes: before.notes, meetingLink: before.meetingLink, date: before.date, teacherId: before.teacherId },
            after: { status: booking.status, notes: booking.notes, meetingLink: booking.meetingLink, date: booking.date, teacherId: booking.teacherId, creditsRestored },
        });

        return NextResponse.json({ booking: { id: booking.id, status: booking.status }, creditsRestored });
    } catch (error) {
        console.error('Admin bookings PATCH error:', error);
        return NextResponse.json({ error: 'Could not update booking' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (!(await requireDepartment(['THERAPIST']))) return forbidden();
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

