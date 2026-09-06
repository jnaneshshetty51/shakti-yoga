import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import {
    DAY,
    MEMBER_ROLES,
    liveSubWhere,
    headlineStats,
    signupSeries,
    revenueSeries,
    attendanceSeries,
    trialFunnel,
} from '@/lib/metrics';

export const dynamic = 'force-dynamic';

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
    const live = liveSubWhere(now);
    const ago30 = new Date(now.getTime() - 30 * DAY);
    const ago7 = new Date(now.getTime() - 7 * DAY);
    const in7 = new Date(now.getTime() + 7 * DAY);
    const in30 = new Date(now.getTime() + 30 * DAY);

    const [
        headline,
        pendingBookings,
        unhandledMessages,
        newLeads,
        expiringSoon,
        failedPayments7d,
        therapyOutOfCredits,
        storyDrafts,
        blogDrafts,
        bookingsNoLink,
        dormantMembers,
        renew7,
        renew30,
    ] = await Promise.all([
        headlineStats(now),
        prisma.booking.count({ where: { status: 'PENDING' } }),
        prisma.contactMessage.count({ where: { handled: false } }),
        prisma.lead.count({ where: { status: 'NEW' } }),
        prisma.subscription.count({
            where: { status: { in: ['ACTIVE', 'TRIAL'] }, renewalDate: { gt: now, lt: in7 } },
        }),
        prisma.payment.count({ where: { status: 'FAILED', createdAt: { gte: ago7 } } }),
        prisma.user.count({ where: { role: 'MEMBER_THERAPY', credits: 0 } }),
        prisma.story.count({ where: { status: 'DRAFT' } }),
        prisma.blogPost.count({ where: { status: 'DRAFT' } }),
        prisma.booking.count({
            where: { status: { in: ['PENDING', 'CONFIRMED'] }, date: { gt: now }, meetingLink: null },
        }),
        prisma.user.count({
            where: {
                role: { in: MEMBER_ROLES },
                subscription: live,
                OR: [{ lastLogin: null }, { lastLogin: { lt: ago30 } }],
            },
        }),
        prisma.subscription.findMany({
            where: { status: 'ACTIVE', renewalDate: { gt: now, lt: in7 } },
            select: { amount: true },
        }),
        prisma.subscription.findMany({
            where: { status: 'ACTIVE', renewalDate: { gt: now, lt: in30 } },
            select: { amount: true },
        }),
    ]);

    return {
        stats: {
            activeMembers: headline.activeMembers,
            everydayMembers: headline.everydayMembers,
            therapyMembers: headline.therapyMembers,
            trialUsers: headline.trialUsers,
            mrr: headline.mrr,
            newMembers: headline.newMembers,
            newMembersDelta: headline.newMembersDelta,
            lapsed: headline.lapsed,
            lapsedDelta: headline.lapsedDelta,
            paused: headline.paused,
            renewalRevenue7d: Math.round(renew7.reduce((s, x) => s + x.amount, 0)),
            renewalRevenue30d: Math.round(renew30.reduce((s, x) => s + x.amount, 0)),
        },
        attention: {
            pendingBookings,
            unhandledMessages,
            newLeads,
            expiringSoon,
            failedPayments7d,
            therapyOutOfCredits,
            contentDrafts: storyDrafts + blogDrafts,
            bookingsNoLink,
            dormantMembers,
        },
    };
}

async function loadTrends(now: Date) {
    const [signups, revenue, attendance] = await Promise.all([
        signupSeries('30d', now),
        revenueSeries('30d', now),
        attendanceSeries('30d', now),
    ]);
    return { signups, revenue, attendance };
}

async function loadTeacherLoad(now: Date) {
    const in7 = new Date(now.getTime() + 7 * DAY);
    const teachers = await prisma.user.findMany({
        where: { role: 'TEACHER' },
        select: {
            id: true,
            name: true,
            _count: {
                select: {
                    classesTaught: { where: { active: true } },
                    sessionsTaught: {
                        where: { date: { gte: now, lt: in7 }, status: { in: ['PENDING', 'CONFIRMED'] } },
                    },
                    availability: { where: { active: true } },
                },
            },
        },
    });
    return teachers
        .map((t) => ({
            id: t.id,
            name: t.name,
            batches: t._count.classesTaught,
            upcomingSessions: t._count.sessionsTaught,
            hasAvailability: t._count.availability > 0,
        }))
        .sort((a, b) => b.upcomingSessions - a.upcomingSessions);
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

    return [...eventItems, ...auditItems].sort((x, y) => y.at.localeCompare(x.at)).slice(0, 12);
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

    const results = await Promise.allSettled([
        loadCounts(now),
        loadTrends(now),
        loadTrialFunnelSection(now),
        loadTeacherLoad(now),
        loadUpcomingSessions(now, horizon),
        loadUpcomingClasses(now, horizon),
        loadActivity(),
        loadSignups(now),
    ]);
    const [countsR, trendsR, funnelR, teachersR, sessionsR, classesR, activityR, signupsR] = results;

    const counts = val(countsR, {
        stats: {
            activeMembers: 0, everydayMembers: 0, therapyMembers: 0, trialUsers: 0, mrr: 0,
            newMembers: 0, newMembersDelta: null as number | null,
            lapsed: 0, lapsedDelta: null as number | null, paused: 0,
            renewalRevenue7d: 0, renewalRevenue30d: 0,
        },
        attention: {
            pendingBookings: 0, unhandledMessages: 0, newLeads: 0, expiringSoon: 0,
            failedPayments7d: 0, therapyOutOfCredits: 0, contentDrafts: 0,
            bookingsNoLink: 0, dormantMembers: 0,
        },
    });

    return NextResponse.json(
        {
            generatedAt: now.toISOString(),
            partial: results.some((r) => r.status === 'rejected'),
            stats: counts.stats,
            attention: counts.attention,
            trends: val(trendsR, { signups: [], revenue: [], attendance: [] }),
            trialFunnel: val(funnelR, null),
            teacherLoad: val(teachersR, []),
            upcomingSessions: val(sessionsR, []),
            upcomingClasses: val(classesR, []),
            activity: val(activityR, []),
            recentSignups: val(signupsR, []),
        },
        { headers: { 'Cache-Control': 'no-store' } },
    );
}

async function loadTrialFunnelSection(now: Date) {
    return trialFunnel('30d', now);
}
