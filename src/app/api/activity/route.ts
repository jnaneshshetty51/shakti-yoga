import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { buildMemberActivity } from '@/lib/member-activity';
import {
    getNotificationState,
    markAllNotificationsRead,
    dismissNotification,
    isRead,
    isDismissed,
} from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
    const payload = await getSession();
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const [items, state] = await Promise.all([
            buildMemberActivity(payload.id),
            getNotificationState(payload.id),
        ]);

        const visible = items
            .filter((n) => !isDismissed(n, state))
            .map((n) => ({ ...n, read: isRead(n, state) }));
        const unreadCount = visible.reduce((n, x) => n + (x.read ? 0 : 1), 0);

        return NextResponse.json(
            { items: visible, unreadCount, seenAt: state.seenAt },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        console.error('Member activity GET error:', error);
        return NextResponse.json({ error: 'Could not load activity' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const payload = await getSession();
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = (await request.json().catch(() => ({}))) as { action?: string; id?: string };

        if (body.action === 'markAllRead') {
            await markAllNotificationsRead(payload.id);
            return NextResponse.json({ ok: true });
        }
        if (body.action === 'dismiss' && typeof body.id === 'string' && body.id.length <= 128) {
            await dismissNotification(payload.id, body.id);
            return NextResponse.json({ ok: true });
        }
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('Member activity POST error:', error);
        return NextResponse.json({ error: 'Could not update activity' }, { status: 500 });
    }
}
