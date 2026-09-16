import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTeacher } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { sendPush } from '@/lib/push';
import { pushTemplates } from '@/lib/push-templates';

export const dynamic = 'force-dynamic';

// Allows a trailing query string / slash — a link copied straight from a
// browser's address bar often carries "?authuser=0" or similar, and the
// previous exact-match regex rejected an otherwise perfectly valid link.
const MEET_RE = /^https:\/\/[a-z0-9.-]*meet\.google\.com\/[a-z-]+\/?(\?.*)?$/i;

const REGULAR_WINDOW_DAYS = 30;

/** Set (or clear with "") the Google Meet link on a class instance or a 1:1
 *  booking the teacher owns (including a substitute covering that instance). */
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
                select: { id: true, batchId: true, teacherId: true, meetingLink: true, batch: { select: { teacherId: true, name: true } } },
            });
            const owner = instance ? (instance.teacherId ?? instance.batch.teacherId) : null;
            if (!instance || owner !== session.id) {
                return NextResponse.json({ error: 'Not found' }, { status: 404 });
            }
            const hadLinkBefore = !!instance.meetingLink;
            await prisma.classInstance.update({ where: { id }, data: { meetingLink: value } });

            // Notify the batch's regulars once a link becomes available — a
            // group class has no pre-booked roster to target more narrowly
            // (same heuristic as the class-reminders cron), so this reaches
            // whoever's actually likely to try joining.
            if (value && !hadLinkBefore) {
                const since = new Date(Date.now() - REGULAR_WINDOW_DAYS * 86_400_000);
                const regulars = await prisma.classAttendance.findMany({
                    where: { classInstance: { batchId: instance.batchId }, joinedAt: { gte: since } },
                    select: { userId: true },
                    distinct: ['userId'],
                });
                if (regulars.length > 0) {
                    sendPush(
                        regulars.map((r) => r.userId),
                        { title: 'Meeting link ready', body: `${instance.batch.name}'s Meet link is up — tap to join.`, url: '/dashboard/classes', channelId: 'classes' },
                    ).catch(() => {});
                }
            }
        } else {
            const booking = await prisma.booking.findUnique({
                where: { id },
                select: { id: true, teacherId: true, userId: true },
            });
            if (!booking || booking.teacherId !== session.id) {
                return NextResponse.json({ error: 'Not found' }, { status: 404 });
            }
            await prisma.booking.update({ where: { id }, data: { meetingLink: value } });

            if (value) {
                sendPush(booking.userId, pushTemplates.sessionLinkReady()).catch(() => {});
            }
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
