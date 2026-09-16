import { prisma } from '@/lib/prisma';
import { Prisma, type Role } from '@prisma/client';
import { sumAsInr, convertToInr, getUsdToInrRate } from '@/lib/fx';

/**
 * Single source of truth for the numbers shown on the admin dashboard and the
 * analytics page. Both surfaces must agree, so the computations live here rather
 * than being re-derived (differently) in each route.
 *
 * There is no metrics-snapshot table, so every "growth" figure is strictly
 * this-period vs the immediately-preceding equal-length period, computed live.
 */

export const DAY = 86_400_000;
export const MEMBER_ROLES: Role[] = ['MEMBER_EVERYDAY', 'MEMBER_STARTER', 'MEMBER_THERAPY'];

export type RangeKey = '7d' | '30d' | '90d' | '12m';
export const RANGE_DAYS: Record<RangeKey, number> = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };

export function toRange(v: string | null | undefined): RangeKey {
    return v === '7d' || v === '30d' || v === '90d' || v === '12m' ? v : '30d';
}

export function rangeWindow(range: RangeKey, now = new Date()) {
    const days = RANGE_DAYS[range];
    const start = new Date(now.getTime() - days * DAY);
    const prevStart = new Date(start.getTime() - days * DAY);
    return { days, now, start, prevStart };
}

/** A subscription that currently entitles the user to something. */
export function liveSubWhere(now = new Date()): Prisma.SubscriptionWhereInput {
    return { status: { in: ['ACTIVE', 'TRIAL'] }, renewalDate: { gt: now } };
}

/** Percent change prev→curr, rounded to 0.1. null when there's no baseline. */
export function pctDelta(curr: number, prev: number): number | null {
    if (!prev) return null;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
}

/* ------------------------------------------------------------------ *
 *  Headline stats (identical on dashboard + analytics)
 * ------------------------------------------------------------------ */

export interface HeadlineStats {
    activeMembers: number;
    everydayMembers: number;
    therapyMembers: number;
    trialUsers: number;
    mrr: number;
    newMembers: number;
    newMembersPrev: number;
    newMembersDelta: number | null;
    lapsed: number;
    lapsedPrev: number;
    lapsedDelta: number | null;
    paused: number;
}

export async function headlineStats(now = new Date()): Promise<HeadlineStats> {
    const live = liveSubWhere(now);
    const ago30 = new Date(now.getTime() - 30 * DAY);
    const ago60 = new Date(now.getTime() - 60 * DAY);
    const lapsedStatuses: Prisma.SubscriptionWhereInput['status'] = { in: ['CANCELLED', 'EXPIRED'] };

    const [
        everydayMembers,
        therapyMembers,
        trialUsers,
        activeSubs,
        newMembers,
        newMembersPrev,
        lapsed,
        lapsedPrev,
        paused,
    ] = await prisma.$transaction([
        prisma.user.count({ where: { role: 'MEMBER_EVERYDAY', subscription: live } }),
        prisma.user.count({ where: { role: 'MEMBER_THERAPY', subscription: live } }),
        prisma.user.count({ where: { role: 'TRIAL' } }),
        // MRR = paid subs that are actually current (ACTIVE and not past their
        // renewal date). A sub that's ACTIVE but lapsed on renewal is dead revenue.
        prisma.subscription.findMany({
            where: { status: 'ACTIVE', renewalDate: { gt: now } },
            select: { amount: true, currency: true },
        }),
        prisma.user.count({ where: { role: { in: MEMBER_ROLES }, createdAt: { gte: ago30 } } }),
        prisma.user.count({ where: { role: { in: MEMBER_ROLES }, createdAt: { gte: ago60, lt: ago30 } } }),
        // No createdAt/updatedAt on Subscription — use renewalDate as the "lapsed on" proxy.
        prisma.subscription.count({ where: { status: lapsedStatuses, renewalDate: { gte: ago30, lt: now } } }),
        prisma.subscription.count({ where: { status: lapsedStatuses, renewalDate: { gte: ago60, lt: ago30 } } }),
        prisma.subscription.count({ where: { status: 'PAUSED' } }),
    ]);

    return {
        activeMembers: everydayMembers + therapyMembers,
        everydayMembers,
        therapyMembers,
        trialUsers,
        mrr: Math.round(await sumAsInr(activeSubs)),
        newMembers,
        newMembersPrev,
        newMembersDelta: pctDelta(newMembers, newMembersPrev),
        lapsed,
        lapsedPrev,
        lapsedDelta: pctDelta(lapsed, lapsedPrev),
        paused,
    };
}

/* ------------------------------------------------------------------ *
 *  Time series (dependency-free — just bucketed points)
 * ------------------------------------------------------------------ */

export type SeriesPoint = { label: string; value: number };
type Bucket = 'day' | 'week' | 'month';

function bucketFor(days: number): Bucket {
    if (days <= 31) return 'day';
    if (days <= 92) return 'week';
    return 'month';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Monday-anchored UTC day for a date. */
function weekStart(d: Date): Date {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
    return x;
}

function keyOf(d: Date, bucket: Bucket): string {
    if (bucket === 'month') return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const base = bucket === 'week' ? weekStart(d) : d;
    return `${base.getUTCFullYear()}-${base.getUTCMonth()}-${base.getUTCDate()}`;
}

function labelOf(d: Date, bucket: Bucket): string {
    if (bucket === 'month') return MONTHS[d.getUTCMonth()];
    const base = bucket === 'week' ? weekStart(d) : d;
    return `${base.getUTCDate()} ${MONTHS[base.getUTCMonth()]}`;
}

/** Build every bucket from start→now (inclusive) so gaps render as zero. */
function emptyBuckets(start: Date, now: Date, bucket: Bucket): { key: string; label: string; value: number }[] {
    const out: { key: string; label: string; value: number }[] = [];
    const cursor =
        bucket === 'month'
            ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
            : bucket === 'week'
                ? weekStart(start)
                : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));

    let guard = 0;
    while (cursor.getTime() <= now.getTime() && guard++ < 400) {
        out.push({ key: keyOf(cursor, bucket), label: labelOf(cursor, bucket), value: 0 });
        if (bucket === 'month') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        else cursor.setUTCDate(cursor.getUTCDate() + (bucket === 'week' ? 7 : 1));
    }
    return out;
}

function fold(points: { at: Date; value: number }[], start: Date, now: Date, bucket: Bucket): SeriesPoint[] {
    const buckets = emptyBuckets(start, now, bucket);
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const p of points) {
        const b = byKey.get(keyOf(p.at, bucket));
        if (b) b.value += p.value;
    }
    return buckets.map((b) => ({ label: b.label, value: Math.round(b.value * 100) / 100 }));
}

export async function revenueSeries(range: RangeKey, now = new Date()): Promise<SeriesPoint[]> {
    const { start, days } = rangeWindow(range, now);
    const rows = await prisma.revenueRecord.findMany({
        where: { status: 'SUCCESS', createdAt: { gte: start } },
        select: { createdAt: true, amount: true, currency: true },
    });
    const rate = rows.some((r) => r.currency === 'USD') ? await getUsdToInrRate() : 1;
    return fold(rows.map((r) => ({ at: r.createdAt, value: convertToInr(r.amount, r.currency, rate) })), start, now, bucketFor(days));
}

export async function signupSeries(range: RangeKey, now = new Date()): Promise<SeriesPoint[]> {
    const { start, days } = rangeWindow(range, now);
    const rows = await prisma.user.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } });
    return fold(rows.map((r) => ({ at: r.createdAt, value: 1 })), start, now, bucketFor(days));
}

export async function attendanceSeries(range: RangeKey, now = new Date()): Promise<SeriesPoint[]> {
    const { start, days } = rangeWindow(range, now);
    const rows = await prisma.classAttendance.findMany({
        where: { joinedAt: { gte: start } },
        select: { joinedAt: true },
    });
    return fold(rows.map((r) => ({ at: r.joinedAt, value: 1 })), start, now, bucketFor(days));
}

/* ------------------------------------------------------------------ *
 *  Trial funnel + class fill rate
 * ------------------------------------------------------------------ */

export async function trialFunnel(range: RangeKey, now = new Date()) {
    const { start } = rangeWindow(range, now);
    const since = { trialRequestedAt: { gte: start } };
    const [requested, scheduled, attended, converted, noShow] = await prisma.$transaction([
        prisma.lead.count({ where: since }),
        prisma.lead.count({ where: { ...since, trialDate: { not: null } } }),
        prisma.lead.count({ where: { ...since, trialAttended: true } }),
        prisma.lead.count({ where: { ...since, status: 'CONVERTED' } }),
        prisma.lead.count({ where: { ...since, trialAttended: false, trialDate: { lt: now } } }),
    ]);
    return {
        requested,
        scheduled,
        attended,
        converted,
        noShow,
        conversionRate: requested ? Math.round((converted / requested) * 1000) / 10 : 0,
    };
}

/** Members (everyday + therapy) gained in the range vs the prior equal period. */
export async function membersGained(range: RangeKey, now = new Date()) {
    const { start, prevStart } = rangeWindow(range, now);
    const [current, previous] = await prisma.$transaction([
        prisma.user.count({ where: { role: { in: MEMBER_ROLES }, createdAt: { gte: start } } }),
        prisma.user.count({ where: { role: { in: MEMBER_ROLES }, createdAt: { gte: prevStart, lt: start } } }),
    ]);
    return { current, previous, delta: pctDelta(current, previous) };
}

/** Actual revenue collected (RevenueRecord, SUCCESS) this range vs the prior one. */
export async function revenueTotals(range: RangeKey, now = new Date()) {
    const { start, prevStart } = rangeWindow(range, now);
    const [curRows, prevRows] = await Promise.all([
        prisma.revenueRecord.findMany({
            where: { status: 'SUCCESS', createdAt: { gte: start } },
            select: { amount: true, currency: true },
        }),
        prisma.revenueRecord.findMany({
            where: { status: 'SUCCESS', createdAt: { gte: prevStart, lt: start } },
            select: { amount: true, currency: true },
        }),
    ]);
    const current = Math.round(await sumAsInr(curRows));
    const previous = Math.round(await sumAsInr(prevRows));
    return { current, previous, delta: pctDelta(current, previous) };
}

/**
 * Real revenue attribution by lead source — not the `dealValue`-style manual
 * estimates elsewhere, but actual PAID `Payment` totals for the users each
 * source's converted leads actually became. Answers "which channel is worth
 * the money" rather than just "which channel makes the most leads."
 */
export async function leadSourceAttribution() {
    const leads = await prisma.lead.findMany({
        select: { source: true, status: true, convertedToUserId: true },
    });

    type Row = { leads: number; converted: number; revenue: number };
    const bySource = new Map<string, Row>();
    for (const l of leads) {
        const row = bySource.get(l.source) ?? { leads: 0, converted: 0, revenue: 0 };
        row.leads += 1;
        if (l.status === 'CONVERTED') row.converted += 1;
        bySource.set(l.source, row);
    }

    const convertedUserIds = leads.map((l) => l.convertedToUserId).filter((id): id is string => !!id);
    if (convertedUserIds.length) {
        const payments = await prisma.payment.findMany({
            where: { userId: { in: convertedUserIds }, status: 'PAID' },
            select: { userId: true, amount: true, currency: true },
        });
        const rate = payments.some((p) => p.currency === 'USD') ? await getUsdToInrRate() : 1;
        const revenueByUser = new Map<string, number>();
        for (const p of payments) revenueByUser.set(p.userId, (revenueByUser.get(p.userId) ?? 0) + convertToInr(p.amount, p.currency, rate));

        for (const l of leads) {
            if (!l.convertedToUserId) continue;
            const revenue = revenueByUser.get(l.convertedToUserId);
            if (!revenue) continue;
            const row = bySource.get(l.source)!;
            row.revenue += revenue;
        }
    }

    return Array.from(bySource.entries())
        .map(([source, row]) => ({
            source,
            leads: row.leads,
            converted: row.converted,
            conversionRate: row.leads ? Math.round((row.converted / row.leads) * 1000) / 10 : 0,
            revenue: Math.round(row.revenue),
        }))
        .sort((a, b) => b.revenue - a.revenue);
}

export async function classFillRate(range: RangeKey, now = new Date()) {
    const { start } = rangeWindow(range, now);
    const [instances, eligible] = await Promise.all([
        prisma.classInstance.findMany({
            where: { date: { gte: start, lt: now } },
            select: { attendanceCount: true },
        }),
        prisma.user.count({
            where: { role: { in: ['MEMBER_EVERYDAY', 'TRIAL'] }, subscription: liveSubWhere(now) },
        }),
    ]);
    const classes = instances.length;
    const avg = classes ? instances.reduce((s, i) => s + i.attendanceCount, 0) / classes : 0;
    return {
        classes,
        eligible,
        avgAttendees: Math.round(avg * 10) / 10,
        rate: eligible ? Math.min(100, Math.round((avg / eligible) * 100)) : 0,
    };
}
