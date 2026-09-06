import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sendEmail, emailLayout } from '@/lib/email';
import { readJson, str, optStr, ValidationError, handleValidationError } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { recordEvent } from '@/lib/analytics';
import { bookingInstant, availableSlots } from '@/lib/booking';
import { Prisma } from '@prisma/client';

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const bookings = await prisma.booking.findMany({
            where: { userId: session.id },
            include: { teacher: { select: { name: true } } },
            orderBy: { date: 'desc' },
        });
        return NextResponse.json({
            bookings: bookings.map((b) => ({
                id: b.id,
                type: b.type,
                status: b.status,
                date: b.date.toISOString(),
                teacher: b.teacher.name,
                notes: b.notes,
                hasMeetingLink: Boolean(b.meetingLink),
            })),
        });
    } catch (error) {
        console.error('Bookings GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { allowed, retryAfterSeconds } = rateLimit(`booking:${getClientIp(request)}`, 15, 60 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many booking attempts. Please try again later.' },
            { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
        );
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: session.id } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Everyday members join the group class directly — they don't book.
        // Booking is for 1:1 therapy (members) and the one trial consultation.
        if (user.role === 'MEMBER_EVERYDAY') {
            return NextResponse.json(
                { error: 'Your plan is the daily group class — just tap Join on your dashboard, no booking needed.' },
                { status: 400 },
            );
        }
        if (user.role !== 'MEMBER_THERAPY' && user.role !== 'TRIAL') {
            return NextResponse.json(
                { error: 'An active membership or trial is required to book a session.', paywall: true },
                { status: 403 },
            );
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
        if (when.getTime() < Date.now()) {
            throw new ValidationError('That time has already passed. Pick a later slot.');
        }

        const isTherapy = user.role === 'MEMBER_THERAPY';

        // Trial users get a single consultation.
        if (!isTherapy) {
            const existing = await prisma.booking.count({
                where: { userId: user.id, status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] } },
            });
            if (existing >= 1) {
                return NextResponse.json(
                    { error: 'Your trial includes one consultation. Subscribe to Yoga Therapy for ongoing 1:1 sessions.' },
                    { status: 403 },
                );
            }
        }

        // Resolve the teacher whose availability covers this slot (fall back to any teacher).
        const teachers = await prisma.user.findMany({ where: { role: 'TEACHER' }, select: { id: true } });
        if (teachers.length === 0) {
            return NextResponse.json({ error: 'No teacher is available right now. Please contact us.' }, { status: 503 });
        }
        let teacherId = teachers[0].id;
        let slotOk = false;
        for (const t of teachers) {
            const open = await availableSlots(t.id, dateStr);
            if (open.some((s) => s.startsWith(slot.split(/\s*[-–]\s*/)[0]))) {
                teacherId = t.id;
                slotOk = true;
                break;
            }
        }
        // If no availability rules exist yet, allow the booking (soft launch) but
        // still block a slot that's already taken (the unique index does that).
        const anyRules = await prisma.teacherAvailability.count({ where: { active: true } });
        if (anyRules > 0 && !slotOk) {
            return NextResponse.json({ error: 'That slot is no longer available. Please pick another.' }, { status: 409 });
        }

        if (isTherapy && user.credits <= 0) {
            return NextResponse.json(
                { error: 'You have no 1:1 session credits left. Renew your Yoga Therapy plan to add more.' },
                { status: 403 },
            );
        }

        let booking;
        try {
            booking = await prisma.$transaction(async (tx) => {
                if (isTherapy) {
                    const debit = await tx.user.updateMany({
                        where: { id: user.id, credits: { gt: 0 } },
                        data: { credits: { decrement: 1 } },
                    });
                    if (debit.count === 0) throw new ValidationError('You have no session credits left.');
                }
                return tx.booking.create({
                    data: {
                        userId: user.id,
                        teacherId,
                        type: isTherapy ? 'THERAPY_SESSION' : 'CONSULTATION',
                        status: 'CONFIRMED',
                        date: when,
                        notes: notes ?? null,
                    },
                });
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                return NextResponse.json({ error: 'That slot was just taken. Please pick another.' }, { status: 409 });
            }
            throw e;
        }

        recordEvent('BOOKING', {
            userId: user.id,
            metadata: { type: booking.type, date: when.toISOString() },
        });

        const whenLabel = when.toLocaleString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true,
            timeZone: 'Asia/Kolkata',
        });
        sendEmail({
            to: user.email,
            subject: `Session confirmed — ${whenLabel} IST`,
            html: emailLayout(
                `<p>Hi ${user.name.split(' ')[0] || 'there'},</p>
                 <p>Your ${isTherapy ? '1:1 therapy session' : 'consultation'} is confirmed for <strong>${whenLabel} IST</strong>.</p>
                 <p>The Google Meet link will appear on your dashboard shortly before the session. ${isTherapy ? `Credits remaining: <strong>${user.credits - 1}</strong>.` : ''}</p>`,
            ),
        }).catch(() => { });

        return NextResponse.json({
            success: true,
            booking: { id: booking.id, date: booking.date.toISOString(), status: booking.status },
            creditsRemaining: isTherapy ? user.credits - 1 : user.credits,
        });
    } catch (error) {
        if (error instanceof ValidationError) return handleValidationError(error);
        console.error('Create booking error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
