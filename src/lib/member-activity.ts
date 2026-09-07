import { prisma } from '@/lib/prisma';

/**
 * The member-facing activity feed (the /dashboard/activity screen and its bell).
 * Same shape and read-state mechanism as the admin notification centre
 * (`@/lib/notifications`) but scoped to one member and built from their own data.
 */

const DAY = 86_400_000;

export interface MemberActivityItem {
    id: string;
    kind: 'alert' | 'reminder' | 'info';
    severity: 'high' | 'medium' | 'low';
    title: string;
    body?: string;
    href: string;
    at: string; // ISO
}

const EVENT_LABEL: Record<string, string> = {
    SIGNUP: 'Welcome to Shakti Yoga',
    TRIAL_START: 'Your free trial started',
    SUBSCRIPTION: 'Subscription activated',
    SUBSCRIPTION_RENEWED: 'Subscription renewed',
    SUBSCRIPTION_CANCELLED: 'Subscription cancelled',
    BOOKING: 'You booked a 1:1 session',
    BOOKING_CANCELLED: 'A 1:1 session was cancelled',
    CLASS_JOIN: 'You joined the group class',
    PAYMENT_FAILED: 'A payment failed',
};

function relWhen(d: Date, now: Date): string {
    const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    const sameDay = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now.getTime() + DAY).toDateString() === d.toDateString();
    if (sameDay) return `today at ${time}`;
    if (tomorrow) return `tomorrow at ${time}`;
    return `${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })} at ${time}`;
}

export async function buildMemberActivity(userId: string, now = new Date()): Promise<MemberActivityItem[]> {
    const in48 = new Date(now.getTime() + 2 * DAY);
    const in7 = new Date(now.getTime() + 7 * DAY);
    const ago7 = new Date(now.getTime() - 7 * DAY);
    const ago30 = new Date(now.getTime() - 30 * DAY);

    const settled = await Promise.allSettled([
        prisma.classInstance.findMany({
            where: {
                date: { gte: now, lt: in48 },
                status: { not: 'Cancelled' },
                batch: { active: true },
            },
            include: { batch: { select: { name: true, teacher: { select: { name: true } } } } },
            orderBy: { date: 'asc' },
            take: 6,
        }),
        prisma.booking.findMany({
            where: { userId, date: { gte: now, lt: in7 }, status: { in: ['PENDING', 'CONFIRMED'] } },
            include: { teacher: { select: { name: true } } },
            orderBy: { date: 'asc' },
        }),
        prisma.subscription.findUnique({
            where: { userId },
            select: { planType: true, status: true, renewalDate: true },
        }),
        prisma.payment.findMany({
            where: { userId, status: 'FAILED', createdAt: { gte: ago7 } },
            select: { id: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.analyticsEvent.findMany({
            where: { userId, timestamp: { gte: ago30 } },
            orderBy: { timestamp: 'desc' },
            take: 20,
        }),
    ]);

    const [classes, sessions, sub, failedPayments, events] = settled.map((r) =>
        r.status === 'fulfilled' ? r.value : null,
    ) as [
        ({ id: string; date: Date; batch: { name: string; teacher: { name: string } | null } | null })[] | null,
        ({ id: string; date: Date; meetingLink: string | null; type: string; teacher: { name: string } | null })[] | null,
        { planType: string; status: string; renewalDate: Date } | null,
        { id: string; createdAt: Date }[] | null,
        { id: string; eventType: string; timestamp: Date }[] | null,
    ];

    const out: MemberActivityItem[] = [];

    for (const c of classes ?? []) {
        out.push({
            id: `class:${c.id}`,
            kind: 'reminder',
            severity: 'medium',
            title: `${c.batch?.name ?? 'Group class'} ${relWhen(c.date, now)}`,
            body: c.batch?.teacher?.name ? `with ${c.batch.teacher.name}` : undefined,
            href: '/dashboard/classes',
            at: c.date.toISOString(),
        });
    }

    for (const s of sessions ?? []) {
        const within24 = s.date.getTime() - now.getTime() < DAY;
        out.push({
            id: `session:${s.id}`,
            kind: within24 && !s.meetingLink ? 'alert' : 'reminder',
            severity: within24 && !s.meetingLink ? 'high' : 'medium',
            title: `1:1 session ${relWhen(s.date, now)}`,
            body: within24 && !s.meetingLink
                ? 'No Meet link yet — check back shortly or contact us.'
                : s.teacher?.name
                    ? `with ${s.teacher.name}`
                    : undefined,
            href: '/dashboard/therapy/book',
            at: s.date.toISOString(),
        });
    }

    if (sub && sub.renewalDate <= in7 && sub.renewalDate >= now && ['ACTIVE', 'TRIAL'].includes(sub.status)) {
        out.push({
            id: 'renewal',
            kind: 'reminder',
            severity: 'medium',
            title: `Your ${sub.planType.replace(/_/g, ' ').toLowerCase()} plan renews on ${sub.renewalDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`,
            href: '/dashboard/billing',
            at: sub.renewalDate.toISOString(),
        });
    }

    for (const p of failedPayments ?? []) {
        out.push({
            id: `payment-failed:${p.id}`,
            kind: 'alert',
            severity: 'high',
            title: 'A payment did not go through',
            body: 'Update your payment method to keep your access.',
            href: '/dashboard/billing',
            at: p.createdAt.toISOString(),
        });
    }

    for (const e of events ?? []) {
        const label = EVENT_LABEL[e.eventType];
        if (!label) continue;
        out.push({
            id: `event:${e.id}`,
            kind: 'info',
            severity: 'low',
            title: label,
            href: e.eventType === 'PAYMENT_FAILED' ? '/dashboard/billing' : '/dashboard',
            at: e.timestamp.toISOString(),
        });
    }

    return out.sort((x, y) => y.at.localeCompare(x.at));
}
