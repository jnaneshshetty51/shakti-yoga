import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
    buildAdminNotifications,
    getNotificationState,
    markAllNotificationsRead,
    dismissNotification,
    isRead,
    isDismissed,
} from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
    const admin = await requireAdmin();
    if (!admin) return forbidden();

    try {
        const [items, state] = await Promise.all([
            buildAdminNotifications(),
            getNotificationState(admin.id),
        ]);

        const withRead = items
            .filter((n) => !isDismissed(n, state))
            .map((n) => ({ ...n, read: isRead(n, state) }));
        const unreadCount = withRead.reduce((n, x) => n + (x.read ? 0 : 1), 0);

        return NextResponse.json(
            { items: withRead, unreadCount, seenAt: state.seenAt },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        console.error('Admin notifications GET error:', error);
        return NextResponse.json({ error: 'Could not load notifications' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();

    try {
        const body = (await request.json().catch(() => ({}))) as { action?: string; id?: string };

        if (body.action === 'markAllRead') {
            await markAllNotificationsRead(admin.id);
            return NextResponse.json({ ok: true });
        }

        if (body.action === 'dismiss' && typeof body.id === 'string' && body.id.length <= 128) {
            await dismissNotification(admin.id, body.id);
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('Admin notifications POST error:', error);
        return NextResponse.json({ error: 'Could not update notifications' }, { status: 500 });
    }
}
