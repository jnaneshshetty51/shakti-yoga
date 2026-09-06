import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { cancelBooking, bookingInstant, availableSlots } from '@/lib/booking';
import { readJson, str, optStr, ValidationError, handleValidationError } from '@/lib/validation';
import { Prisma } from '@prisma/client';

const SESSION_MINUTES = 45;

async function loadOwned(id: string, session: { id: string; role: string }) {
    const booking = await prisma.booking.findUnique({ where: { id } });
    const staff = session.role === 'admin' || session.role === 'teacher';
    if (!booking) return { booking: null, staff, mine: false };
    const mine = booking.userId === session.id || booking.teacherId === session.id;
    return { booking, staff, mine };
}

/** Return the Meet link — only to the booking's member or teacher, only in the join window. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await ctx.params;

    const { booking, staff, mine } = await loadOwned(id, session);
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (!staff && !mine) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const start = booking.date.getTime();
    const opensAt = start - 15 * 60_000;
    const closesAt = start + (SESSION_MINUTES + 15) * 60_000;
    const now = Date.now();
    const joinable = staff || (now >= opensAt && now <= closesAt);

    if (booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') {
        return NextResponse.json({ error: 'This session was cancelled.' }, { status: 409 });
    }
    if (!joinable) {
        return NextResponse.json(
            { error: now < opensAt ? 'The session link opens 15 minutes before the start time.' : 'This session has ended.' },
            { status: 403 },
        );
    }
    if (!booking.meetingLink) {
        return NextResponse.json({ error: 'No meeting link has been set for this session yet.' }, { status: 409 });
    }
    return NextResponse.json({ meetingLink: booking.meetingLink });
}

/** Reschedule (member or staff) — moves the same booking, no credit change. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await ctx.params;

    try {
        const { booking, staff, mine } = await loadOwned(id, session);
        if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        if (!staff && booking.userId !== session.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        void mine;
        if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
            return NextResponse.json({ error: `Booking is already ${booking.status.toLowerCase()}.` }, { status: 409 });
        }

        const body = await readJson(request);
        const dateStr = str(body.date, { label: 'date', pattern: /^\d{4}-\d{2}-\d{2}$/ });
        const slot = str(body.slot, { label: 'slot', min: 5, max: 40 });
        const notes = optStr(body.notes, { label: 'notes', max: 1000 });

        let when: Date;
        try {
            when = bookingInstant(dateStr, slot);
        } catch {
            throw new ValidationError('Pick a valid date and time slot.');
        }
        if (when.getTime() < Date.now()) throw new ValidationError('That time has already passed.');
        if (!staff && (booking.date.getTime() - Date.now()) < 24 * 3_600_000) {
            return NextResponse.json({ error: 'Sessions can only be rescheduled at least 24 hours in advance.' }, { status: 409 });
        }

        const anyRules = await prisma.teacherAvailability.count({ where: { active: true } });
        if (anyRules > 0) {
            const open = await availableSlots(booking.teacherId, dateStr);
            if (!open.some((s) => s.startsWith(slot.split(/\s*[-–]\s*/)[0]))) {
                return NextResponse.json({ error: 'That slot is not available.' }, { status: 409 });
            }
        }

        try {
            const updated = await prisma.booking.update({
                where: { id },
                data: { date: when, ...(notes !== undefined ? { notes } : {}) },
            });
            return NextResponse.json({ booking: { id: updated.id, date: updated.date.toISOString() } });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                return NextResponse.json({ error: 'That slot is already taken.' }, { status: 409 });
            }
            throw e;
        }
    } catch (error) {
        if (error instanceof ValidationError) return handleValidationError(error);
        console.error('Booking PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/** Cancel — restores the credit per the rules in lib/booking.cancelBooking. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await ctx.params;

    const staff = session.role === 'admin' || session.role === 'teacher';
    const result = await cancelBooking(id, { actorUserId: session.id, byStaff: staff });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, creditsRestored: result.creditsRestored ?? 0 });
}
