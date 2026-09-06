import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { Prisma, type Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

const DAY = 86_400_000;

const EVENT_LABEL: Record<string, string> = {
    SIGNUP: 'New signup',
    TRIAL_START: 'Started a free trial',
    SUBSCRIPTION: 'New subscription',
    SUBSCRIPTION_RENEWED: 'Subscription renewed',
    SUBSCRIPTION_CANCELLED: 'Subscription cancelled',
    BOOKING: 'Booked a 1:1 session',
    BOOKING_CANCELLED: 'Cancelled a 1:1 session',
    CLASS_JOIN: 'Joined the group class',
    PAYMENT_FAILED: 'Payment failed',
};

const EVENT_KIND: Record<string, string> = {
    SIGNUP: 'signup',
    TRIAL_START: 'trial',
    SUBSCRIPTION: 'payment',
    SUBSCRIPTION_RENEWED: 'payment',
    SUBSCRIPTION_CANCELLED: 'alert',
    BOOKING: 'booking',
    BOOKING_CANCELLED: 'alert',
    CLASS_JOIN: 'class',
    PAYMENT_FAILED: 'alert',
};

type ActivityItem = { id: string; kind: string; message: string; at: string };

/** Run a section loader; on failure log it and return the fallback so one broken
 *  query never blanks the whole dashboard. */
function val<T>(r: PromiseSettledResult<T>, fallback: T): T {
    if (r.status === 'fulfilled') return r.value;
    console.error('[dashboard] section failed:', r.reason);
    return fallback;
}

async function loadCounts(now: Date) {
    const liveSub: Prisma.SubscriptionWhereInput = {
        status: { in: ['ACTIVE', 'TRIAL'] },
        renewalDate: { gt: now },
    };
    const memberRoles: Role[] = ['MEMBER_EVERYDAY', 'MEMBER_THERAPY'];
    const ago30 = new Date(now.getTime() - 30 * DAY);
    const ago60 = new Date(now.getTime() - 60 * DAY);
    const ago7 = new Date(now.getTime() - 7 * DAY);
    const in7 = new Date(now.getTime() + 7 * DAY);

    const [
        everydayMembers,
        therapyMembers,
        trialUsers,
        activeSubs,
        newMembers30d,
        newMembersPrev30d,
        pendingBookings,
        unhandledMessages,
        newLeads,
        expiringSoon,
        failedPayments7d,
        therapyOutOfCredits,
    ] = await prisma.$transaction([
        prisma.user.count({ where: { role: 'MEMBER_EVERYDAY', subscription: liveSub } }),
        prisma.user.count({ where: { role: 'MEMBER_THERAPY', subscription: liveSub } }),
        prisma.user.count({ where: { role: 'TRIAL' } }),
        prisma.subscription.findMany({ where: { status: 'ACTIVE' }, select: { amount: true } }),
        prisma.user.count({ where: { role: { in: memberRoles }, createdAt: { gte: ago30 } } }),
        prisma.user.count({ where: { role: { in: memberRoles }, createdAt: { gte: ago60, lt: ago30 } } }),
        prisma.booking.count({ where: { status: 'PENDING' } }),
        prisma.contactMessage.count({ where: { handled: false } }),
        prisma.lead.count({ where: { status: 'NEW' } }),
        prisma.subscription.count({
            where: { status: { in: ['ACTIVE', 'TRIAL'] }, renewalDate: { gt: now, lt: in7 } },
        }),
        prisma.payment.count({ where: { status: 'FAILED', createdAt: { gte: ago7 } } }),
        prisma.user.count({ where: { role: 'MEMBER_THERAPY', credits: 0 } }),
    ]);

    const mrr = Math.round(activeSubs.reduce((s, x) => s + x.amount, 0));
    const growthPct =
        newMembersPrev30d > 0
            ? Math.round(((newMembers30d - newMembersPrev30d) / newMembersPrev30d) * 1000) / 10
            : null;

    return {
        stats: {
            activeMembers: everydayMembers + therapyMembers,
            everydayMembers,
            therapyMembers,
            trialUsers,
            mrr,
            newMembers30d,
            newMembersGrowthPct: growthPct,
        },
        attention: {
            pendingBookings,
            unhandledMessages,
            newLeads,
            expiringSoon,
            failedPayments7d,
            therapyOutOfCredits,
        },
    };
}

async function loadUpcomingSessions(now: Date, horizon: Date) {
    const rows = await prisma.booking.findMany({
        where: { date: { gte: now, lt: horizon }, status: { in: ['PENDING', 'CONFIRMED'] } },
        include: { user: { select: { name: true } }, teacher: { select: { name: true } } },
        orderBy: { date: 'asc' },
        take: 8,
    });
    return rows.map((b) => ({
        id: b.id,
        member: b.user?.name ?? 'Unknown',
        teacher: b.teacher?.name ?? '—',
        type: b.type.replace(/_/g, ' ').toLowerCase(),
        status: b.status,
        at: b.date.toISOString(),
        hasLink: !!b.meetingLink,
    }));
}

async function loadUpcomingClasses(now: Date, horizon: Date) {
    const rows = await prisma.classInstance.findMany({
        where: { date: { gte: now, lt: horizon }, status: { not: 'Cancelled' } },
        include: { batch: { select: { name: true, teacher: { select: { name: true } } } } },
        orderBy: { date: 'asc' },
        take: 6,
    });
    return rows.map((c) => ({
        id: c.id,
        name: c.batch?.name ?? 'Group class',
        teacher: c.batch?.teacher?.name ?? '—',
        at: c.date.toISOString(),
        attendanceCount: c.attendanceCount,
    }));
}

async function loadActivity(): Promise<ActivityItem[]> {
    const [events, audits] = await Promise.all([
        prisma.analyticsEvent.findMany({ orderBy: { timestamp: 'desc' }, take: 12 }),
        prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    ]);

    const userIds = [...new Set(events.map((e) => e.userId).filter((x): x is string => !!x))];
    const users = userIds.length
        ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
        : [];
    const nameById = new Map(users.map((u) => [u.id, u.name]));

    const eventItems: ActivityItem[] = events.map((e) => {
        const who = e.userId ? nameById.get(e.userId) : null;
        const label = EVENT_LABEL[e.eventType] ?? e.eventType.replace(/_/g, ' ').toLowerCase();
        return {
            id: `ev_${e.id}`,
            kind: EVENT_KIND[e.eventType] ?? 'other',
            message: who ? `${who} — ${label}` : label,
            at: e.timestamp.toISOString(),
        };
    });

    const auditItems: ActivityItem[] = audits.map((a) => ({
        id: `au_${a.id}`,
        kind: 'admin',
        message: `${a.actorEmail ?? 'system'} · ${a.action.replace(/\./g, ' ')}${a.entity ? ` (${a.entity})` : ''}`,
        at: a.createdAt.toISOString(),
    }));

    return [...eventItems, ...auditItems]
        .sort((x, y) => y.at.localeCompare(x.at))
        .slice(0, 12);
}

async function loadSignups(now: Date) {
    const rows = await prisma.user.findMany({
        where: { createdAt: { gte: new Date(now.getTime() - 30 * DAY) } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            subscription: { select: { planType: true, status: true } },
        },
    });
    return rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        plan: u.subscription
            ? u.subscription.planType.replace(/_/g, ' ').toLowerCase()
            : u.role === 'TRIAL'
                ? 'trial'
                : null,
        at: u.createdAt.toISOString(),
    }));
}

export async function GET() {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const horizon = new Date(now.getTime() + 2 * DAY);

    const [countsR, sessionsR, classesR, activityR, signupsR] = await Promise.allSettled([
        loadCounts(now),
        loadUpcomingSessions(now, horizon),
        loadUpcomingClasses(now, horizon),
        loadActivity(),
        loadSignups(now),
    ]);

    const counts = val(countsR, {
        stats: {
            activeMembers: 0, everydayMembers: 0, therapyMembers: 0, trialUsers: 0,
            mrr: 0, newMembers30d: 0, newMembersGrowthPct: null as number | null,
        },
        attention: {
            pendingBookings: 0, unhandledMessages: 0, newLeads: 0,
            expiringSoon: 0, failedPayments7d: 0, therapyOutOfCredits: 0,
        },
    });

    const partial =
        [countsR, sessionsR, classesR, activityR, signupsR].some((r) => r.status === 'rejected');

    return NextResponse.json(
        {
            generatedAt: now.toISOString(),
            partial,
            stats: counts.stats,
            attention: counts.attention,
            upcomingSessions: val(sessionsR, []),
            upcomingClasses: val(classesR, []),
            activity: val(activityR, []),
            recentSignups: val(signupsR, []),
        },
        { headers: { 'Cache-Control': 'no-store' } },
    );
}
