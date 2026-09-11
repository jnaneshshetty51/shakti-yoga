import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { sendPush } from '@/lib/push';
import { truncate as cap } from '@/lib/validation';
import {
    PUSH_SEGMENTS,
    SEGMENT_LABEL,
    isPushSegment,
    resolveSegment,
    countWithTokens,
} from '@/lib/push-segments';

export const dynamic = 'force-dynamic';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });
const CHANNELS = ['default', 'classes', 'sessions', 'billing'] as const;

/** GET — segment sizes + recent broadcast history. */
export async function GET() {
    if (!(await requireAdmin())) return forbidden();

    const segments = await Promise.all(
        PUSH_SEGMENTS.map(async (key) => {
            const ids = await resolveSegment(key).catch(() => []);
            return { key, label: SEGMENT_LABEL[key], total: ids.length, reachable: await countWithTokens(ids) };
        }),
    );

    const history = await prisma.broadcastLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
    });

    return NextResponse.json({
        segments,
        channels: CHANNELS,
        history: history.map((h) => ({
            id: h.id,
            title: h.title,
            body: h.body,
            url: h.url,
            segment: h.segment,
            channelId: h.channelId,
            recipients: h.recipients,
            by: h.actorEmail,
            at: h.createdAt.toISOString(),
        })),
    });
}

/** POST — send a broadcast (or a test to the sender only). */
export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();

    const body = await request.json().catch(() => ({}));
    const title = cap(body.title, 80);
    const message = cap(body.body, 240);
    const url = cap(body.url, 300) || undefined;
    const segment = String(body.segment || '');
    const channelId = CHANNELS.includes(body.channelId) ? body.channelId : 'default';
    const test = body.test === true;

    if (!title || !message) {
        return NextResponse.json({ error: 'Title and message are required.' }, { status: 400 });
    }
    if (!isPushSegment(segment)) {
        return NextResponse.json({ error: 'Pick a valid audience.' }, { status: 400 });
    }

    const msg = { title, body: message, url, channelId };

    if (test) {
        await sendPush(admin.id, msg);
        return NextResponse.json({ ok: true, test: true, recipients: 1 });
    }

    const userIds = await resolveSegment(segment);
    const reachable = await countWithTokens(userIds);
    await sendPush(userIds, msg);

    await prisma.broadcastLog.create({
        data: {
            actorId: admin.id,
            actorEmail: admin.email,
            title,
            body: message,
            url: url ?? null,
            segment,
            channelId,
            recipients: reachable,
        },
    });
    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: 'broadcast.send',
        entity: 'BroadcastLog',
        after: { segment, title, recipients: reachable },
    });

    return NextResponse.json({ ok: true, recipients: reachable, targeted: userIds.length });
}
