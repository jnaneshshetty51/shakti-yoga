import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTeacher } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HM = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** A teacher only ever sees / edits their own rules — teacherId comes from the
 *  session, never the request body. */
export async function GET() {
    const session = await requireTeacher();
    if (!session) return forbidden();

    const rules = await prisma.teacherAvailability.findMany({
        where: { teacherId: session.id },
        orderBy: [{ dayOfWeek: 'asc' }, { date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({
        rules: rules.map((r) => ({
            id: r.id,
            dayOfWeek: r.dayOfWeek,
            date: r.date ? r.date.toISOString().slice(0, 10) : null,
            startTime: r.startTime,
            endTime: r.endTime,
            slotMinutes: r.slotMinutes,
            active: r.active,
        })),
    });
}

export async function POST(request: Request) {
    const session = await requireTeacher();
    if (!session) return forbidden();

    try {
        const b = await request.json().catch(() => ({}));
        if (!HM.test(b.startTime ?? '') || !HM.test(b.endTime ?? '')) {
            return NextResponse.json({ error: 'startTime / endTime must be HH:MM (24h)' }, { status: 400 });
        }
        if (b.startTime >= b.endTime) {
            return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
        }
        if (b.dayOfWeek && !DAYS.includes(b.dayOfWeek)) {
            return NextResponse.json({ error: 'dayOfWeek must be Mon..Sun' }, { status: 400 });
        }
        if (!b.dayOfWeek && !b.date) {
            return NextResponse.json({ error: 'Set either a weekday or a specific date' }, { status: 400 });
        }
        const slotMinutes = Math.min(120, Math.max(15, Math.trunc(Number(b.slotMinutes) || 45)));

        const rule = await prisma.teacherAvailability.create({
            data: {
                teacherId: session.id,
                dayOfWeek: b.dayOfWeek || null,
                date: b.date ? new Date(`${b.date}T00:00:00.000Z`) : null,
                startTime: b.startTime,
                endTime: b.endTime,
                slotMinutes,
                active: b.active === undefined ? true : Boolean(b.active),
            },
        });
        await recordAudit({
            actorId: session.id, actorEmail: session.email, ip: getClientIp(request),
            action: 'availability.create', entity: 'TeacherAvailability', entityId: rule.id, after: rule,
        });
        return NextResponse.json({ rule: { id: rule.id } });
    } catch (error) {
        console.error('[teacher] availability POST error:', error);
        return NextResponse.json({ error: 'Could not add availability' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await requireTeacher();
    if (!session) return forbidden();

    try {
        const id = new URL(request.url).searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        // Ownership check — deleteMany scoped to the session's teacherId.
        const { count } = await prisma.teacherAvailability.deleteMany({
            where: { id, teacherId: session.id },
        });
        if (count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        await recordAudit({
            actorId: session.id, actorEmail: session.email, ip: getClientIp(request),
            action: 'availability.delete', entity: 'TeacherAvailability', entityId: id,
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[teacher] availability DELETE error:', error);
        return NextResponse.json({ error: 'Could not delete availability' }, { status: 500 });
    }
}
