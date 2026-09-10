import { prisma } from '@/lib/prisma';
import { DAY } from '@/lib/metrics';

/**
 * Admin notification centre (the top-bar bell).
 *
 * Notifications are *derived* from live data — the same operational signals the
 * dashboard's "Needs attention" panel shows, plus the recent audit trail. There
 * is no notifications table: each alert has a stable `id` and an `at` timestamp
 * taken from the newest underlying record, so an alert re-surfaces as unread
 * whenever something new lands under it.
 *
 * Per-admin read state (last "mark all read" time + individually dismissed ids)
 * lives in the generic `Setting` KV store under `notif_state:<userId>` — no
 * migration required.
 */

export type NotificationSeverity = 'high' | 'medium' | 'low';

export interface AdminNotification {
    id: string;
    kind: 'alert' | 'info';
    severity: NotificationSeverity;
    title: string;
    body?: string;
    href: string;
    at: string; // ISO
}

export interface NotificationState {
    /** Last "mark all read" — anything with `at` on or before this reads as seen. */
    seenAt: string | null;
    /** id -> ISO time it was individually dismissed. An alert re-surfaces when its
     *  underlying `at` moves past the dismissal (e.g. a newer pending booking). */
    dismissed: Record<string, string>;
}

const STATE_KEY = (userId: string) => `notif_state:${userId}`;
const MAX_DISMISSED = 300;

export function isNotifStateKey(key: string): boolean {
    return key.startsWith('notif_state:');
}

export async function getNotificationState(userId: string): Promise<NotificationState> {
    const row = await prisma.setting.findUnique({ where: { key: STATE_KEY(userId) } });
    if (!row) return { seenAt: null, dismissed: {} };
    try {
        const parsed = JSON.parse(row.value) as Partial<NotificationState>;
        const dismissed: Record<string, string> = {};
        if (parsed.dismissed && typeof parsed.dismissed === 'object' && !Array.isArray(parsed.dismissed)) {
            for (const [k, v] of Object.entries(parsed.dismissed)) {
                if (typeof v === 'string') dismissed[k] = v;
            }
        }
        return {
            seenAt: typeof parsed.seenAt === 'string' ? parsed.seenAt : null,
            dismissed,
        };
    } catch {
        return { seenAt: null, dismissed: {} };
    }
}

async function writeState(userId: string, state: NotificationState): Promise<void> {
    // Keep only the most-recently-dismissed ids so the row can't grow unbounded.
    const entries = Object.entries(state.dismissed).sort((a, b) => b[1].localeCompare(a[1])).slice(0, MAX_DISMISSED);
    const value = JSON.stringify({ seenAt: state.seenAt, dismissed: Object.fromEntries(entries) });
    await prisma.setting.upsert({
        where: { key: STATE_KEY(userId) },
        create: { key: STATE_KEY(userId), value },
        update: { value },
    });
}

export async function markAllNotificationsRead(userId: string, at = new Date()): Promise<void> {
    const state = await getNotificationState(userId);
    await writeState(userId, { ...state, seenAt: at.toISOString() });
}

export async function dismissNotification(userId: string, id: string, at = new Date()): Promise<void> {
    const state = await getNotificationState(userId);
    await writeState(userId, { ...state, dismissed: { ...state.dismissed, [id]: at.toISOString() } });
}

/** True when an item should render as already-read. Works for any feed item that
 *  carries a stable `id` and an ISO `at` (admin notifications, member activity). */
export function isRead(item: { id: string; at: string }, state: NotificationState): boolean {
    const dismissedAt = state.dismissed[item.id];
    if (dismissedAt && item.at <= dismissedAt) return true;
    if (state.seenAt && item.at <= state.seenAt) return true;
    return false;
}

/** Items explicitly dismissed and not since re-surfaced — filtered out of the
 *  panel entirely (as opposed to just shown greyed-out). */
export function isDismissed(item: { id: string; at: string }, state: NotificationState): boolean {
    const dismissedAt = state.dismissed[item.id];
    return Boolean(dismissedAt && item.at <= dismissedAt);
}

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;
const iso = (d: Date | null | undefined) => (d ?? new Date(0)).toISOString();

const AUDIT_ACTION_LABEL: Record<string, string> = {
    'settings.update': 'Platform settings updated',
    'user.role.change': 'A user role was changed',
    'user.delete': 'A user was deleted',
    'subscription.update': 'A subscription was changed',
    'subscription.delete': 'A subscription record was deleted',
    'booking.update': 'A booking was updated',
    'booking.delete': 'A booking was deleted',
    'class.instance.cancel': 'A class was cancelled',
    'class.batch.update': 'A class batch was changed',
    'credits.adjust': 'Session credits were adjusted',
    'meet.link.set': 'A Meet link was set',
};

function auditLabel(action: string): string {
    return AUDIT_ACTION_LABEL[action] ?? action.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Build the full notification list for an admin, newest first. Never throws for a
 * single failing section — a broken query just drops that one alert.
 */
export async function buildAdminNotifications(now = new Date()): Promise<AdminNotification[]> {
    const ago7 = new Date(now.getTime() - 7 * DAY);
    const in7 = new Date(now.getTime() + 7 * DAY);

    const settled = await Promise.allSettled([
        prisma.booking.findMany({
            where: { status: 'PENDING' },
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.booking.findMany({
            where: { status: { in: ['PENDING', 'CONFIRMED'] }, date: { gt: now }, meetingLink: null },
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.contactMessage.findMany({
            where: { handled: false },
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.lead.findMany({
            where: { status: 'NEW' },
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.subscription.findMany({
            where: { status: { in: ['ACTIVE', 'TRIAL'] }, renewalDate: { gt: now, lt: in7 } },
            select: { renewalDate: true },
            orderBy: { renewalDate: 'asc' },
        }),
        prisma.payment.findMany({
            where: { status: 'FAILED', createdAt: { gte: ago7 } },
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.user.findMany({
            where: { role: 'MEMBER_THERAPY', credits: 0 },
            select: { updatedAt: true },
            orderBy: { updatedAt: 'desc' },
        }),
        prisma.story.findMany({ where: { status: 'DRAFT' }, select: { createdAt: true }, orderBy: { createdAt: 'desc' } }),
        prisma.blogPost.findMany({ where: { status: 'DRAFT' }, select: { createdAt: true }, orderBy: { createdAt: 'desc' } }),
        prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 15 }),
    ]);

    const [
        pendingBookings,
        noLinkBookings,
        unhandledMsgs,
        newLeads,
        expiringSubs,
        failedPayments,
        therapyNoCredits,
        storyDrafts,
        blogDrafts,
        recentAudits,
    ] = settled.map((r) => (r.status === 'fulfilled' ? r.value : [])) as unknown as [
        { createdAt: Date }[],
        { createdAt: Date }[],
        { createdAt: Date }[],
        { createdAt: Date }[],
        { renewalDate: Date }[],
        { createdAt: Date }[],
        { updatedAt: Date }[],
        { createdAt: Date }[],
        { createdAt: Date }[],
        {
            id: string; action: string; entity: string; entityId: string | null;
            actorEmail: string | null; createdAt: Date;
        }[],
    ];

    const out: AdminNotification[] = [];

    if (pendingBookings.length) {
        out.push({
            id: 'alert:pending-bookings',
            kind: 'alert',
            severity: 'high',
            title: `${plural(pendingBookings.length, 'booking')} awaiting confirmation`,
            body: 'Confirm or reschedule so the member gets their Meet link.',
            href: '/admin/bookings',
            at: iso(pendingBookings[0].createdAt),
        });
    }

    if (noLinkBookings.length) {
        out.push({
            id: 'alert:bookings-no-link',
            kind: 'alert',
            severity: 'high',
            title: `${plural(noLinkBookings.length, 'upcoming session')} with no Meet link`,
            body: 'Add a Google Meet link before the session starts.',
            href: '/admin/bookings',
            at: iso(noLinkBookings[0].createdAt),
        });
    }

    if (unhandledMsgs.length) {
        out.push({
            id: 'alert:unhandled-messages',
            kind: 'alert',
            severity: 'medium',
            title: `${plural(unhandledMsgs.length, 'unread message')}`,
            body: 'Contact-form enquiries waiting for a reply.',
            href: '/admin/messages',
            at: iso(unhandledMsgs[0].createdAt),
        });
    }

    if (newLeads.length) {
        out.push({
            id: 'alert:new-leads',
            kind: 'alert',
            severity: 'medium',
            title: `${plural(newLeads.length, 'new lead')} to follow up`,
            href: '/admin/leads',
            at: iso(newLeads[0].createdAt),
        });
    }

    if (expiringSubs.length) {
        out.push({
            id: 'alert:expiring-subs',
            kind: 'alert',
            severity: 'medium',
            title: `${plural(expiringSubs.length, 'subscription')} expiring within 7 days`,
            body: 'Reach out about renewal before access lapses.',
            href: '/admin/subscriptions',
            at: iso(expiringSubs[0].renewalDate),
        });
    }

    if (failedPayments.length) {
        out.push({
            id: 'alert:failed-payments',
            kind: 'alert',
            severity: 'high',
            title: `${plural(failedPayments.length, 'failed payment')} in the last week`,
            href: '/admin/payments?status=FAILED',
            at: iso(failedPayments[0].createdAt),
        });
    }

    if (therapyNoCredits.length) {
        out.push({
            id: 'alert:therapy-no-credits',
            kind: 'alert',
            severity: 'low',
            title: `${plural(therapyNoCredits.length, 'therapy member')} with no session credits`,
            href: '/admin/members',
            at: iso(therapyNoCredits[0].updatedAt),
        });
    }

    const draftCount = storyDrafts.length + blogDrafts.length;
    if (draftCount) {
        const newest = [...storyDrafts, ...blogDrafts]
            .map((d) => d.createdAt.getTime())
            .sort((a, b) => b - a)[0];
        out.push({
            id: 'alert:content-drafts',
            kind: 'alert',
            severity: 'low',
            title: `${plural(draftCount, 'content draft')} awaiting review`,
            href: '/admin/content',
            at: new Date(newest).toISOString(),
        });
    }

    for (const a of recentAudits) {
        out.push({
            id: `audit:${a.id}`,
            kind: 'info',
            severity: 'low',
            title: auditLabel(a.action),
            body: [a.actorEmail, a.entity].filter(Boolean).join(' · ') || undefined,
            href: '/admin/audit',
            at: iso(a.createdAt),
        });
    }

    return out.sort((x, y) => y.at.localeCompare(x.at));
}
