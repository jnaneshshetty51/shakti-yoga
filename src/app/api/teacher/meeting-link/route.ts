import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTeacher } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const MEET_RE = /^https:\/\/[a-z0-9.-]*meet\.google\.com\/[a-z-]+$/i;

/** Set (or clear with "") the Google Meet link on a class instance or a 1:1
 *  booking the teacher owns. */
export async function POST(request: Request) {
    const session = await requireTeacher();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const kind = body.kind === 'class' || body.kind === 'session' ? body.kind : null;
    const id = typeof body.id === 'string' ? body.id : null;
    const raw = typeof body.url === 'string' ? body.url.trim() : '';
    if (!kind || !id) return NextResponse.json({ error: 'kind and id are required' }, { status: 400 });
    if (raw && !MEET_RE.test(raw)) {
        return NextResponse.json({ error: 'Enter a full https://meet.google.com/xxx-xxxx-xxx link' }, { status: 400 });
    }
    const value = raw || null;

    try {
        if (kind === 'class') {
            const instance = await prisma.classInstance.findUnique({
                where: { id },
                select: { id: true, batch: { select: { teacherId: true } } },
            });
            if (!instance || instance.batch.teacherId !== session.id) {
                return NextResponse.json({ error: 'Not found' }, { status: 404 });
            }
            await prisma.classInstance.update({ where: { id }, data: { meetingLink: value } });
        } else {
            const booking = await prisma.booking.findUnique({
                where: { id },
                select: { id: true, teacherId: true },
            });
            if (!booking || booking.teacherId !== session.id) {
                return NextResponse.json({ error: 'Not found' }, { status: 404 });
            }
            await prisma.booking.update({ where: { id }, data: { meetingLink: value } });
        }

        await recordAudit({
            actorId: session.id, actorEmail: session.email, ip: getClientIp(request),
            action: `${kind === 'class' ? 'class.instance' : 'booking'}.meetlink.update`,
            entity: kind === 'class' ? 'ClassInstance' : 'Booking', entityId: id,
            after: { meetingLink: value },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[teacher] meeting-link error', error);
        return NextResponse.json({ error: 'Could not update the link' }, { status: 500 });
    }
}
