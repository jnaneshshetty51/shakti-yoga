import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { getPlan, isPlanKey } from '@/lib/pricing';
import { sumAsInr } from '@/lib/fx';
import { registerWalkInMember, WalkInConflictError, PAYMENT_METHODS } from '@/lib/walkin';
import { readJson, str, optStr, email as parseEmail, oneOf, ValidationError, handleValidationError } from '@/lib/validation';
import { Prisma } from '@prisma/client';

const IST = 'Asia/Kolkata';

const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST }).format(d);
const fmtDateTime = (d: Date) =>
    new Intl.DateTimeFormat('en-IN', {
        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: IST,
    }).format(d);

const PLAN_LABEL: Record<string, string> = {
    EVERYDAY_YOGA: 'Everyday Yoga',
    YOGA_THERAPY: 'Yoga Therapy',
    TRIAL: 'Trial',
};

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

type TabKey = 'active' | 'group' | 'therapy';
const TAB_KEYS: TabKey[] = ['active', 'group', 'therapy'];

/**
 * Segmented member roster for the admin.
 *   active  — anyone on a live subscription (ACTIVE or TRIAL, not past renewal)
 *   group   — active members entitled to the daily group class (Everyday + Trial)
 *   therapy — active members on the 1:1 track (Yoga Therapy, or holding credits)
 *
 * `tab` picks which segment is paginated/searched/sorted server-side; `counts`
 * (and `mrr`) always reflect the full, unfiltered totals for all three
 * segments — they back the page's StatCards, which show every segment's
 * number regardless of which tab/page/search is currently in view.
 */
export async function GET(request: Request) {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const url = new URL(request.url);
        const tabParam = url.searchParams.get('tab');
        const tab: TabKey = TAB_KEYS.includes(tabParam as TabKey) ? (tabParam as TabKey) : 'active';
        const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE));
        const q = url.searchParams.get('q')?.trim();
        const sortKey = url.searchParams.get('sortKey');
        const sortDir: Prisma.SortOrder = url.searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

        const now = new Date();

        // "live" = on a subscription that's currently ACTIVE/TRIAL and not past
        // its renewal date. All three tabs are drawn from this same base set.
        const liveWhere: Prisma.UserWhereInput = {
            role: { not: 'VISITOR' },
            subscription: { status: { in: ['ACTIVE', 'TRIAL'] }, renewalDate: { gt: now } },
        };
        // group/therapy narrow the live set to a track — mirrors the derived
        // in-memory filters the old client-side version applied to `active`.
        const tabWhere: Record<TabKey, Prisma.UserWhereInput> = {
            active: {},
            group: { OR: [
                { subscription: { planType: 'EVERYDAY_YOGA' } },
                { subscription: { planType: 'TRIAL' } },
                { role: 'TRIAL' },
            ] },
            therapy: { OR: [
                { subscription: { planType: 'YOGA_THERAPY' } },
                { role: 'MEMBER_THERAPY' },
                { credits: { gt: 0 } },
            ] },
        };

        const where: Prisma.UserWhereInput = {
            AND: [
                liveWhere,
                tabWhere[tab],
                ...(q ? [{
                    OR: [
                        { name: { contains: q, mode: 'insensitive' as const } },
                        { email: { contains: q, mode: 'insensitive' as const } },
                        { phone: { contains: q, mode: 'insensitive' as const } },
                    ],
                }] : []),
            ],
        };

        // Only credits/classesAttended/totalSessions/joinedAt/lastLogin map to
        // real, directly-sortable fields (a plain column, or a relation count
        // Prisma can order by) — Plan/Status/Phone/Renewal/Next-session/Upcoming
        // render a derived Badge or formatted/computed value, so none of those
        // offer a sort control from the client.
        const orderBy: Prisma.UserOrderByWithRelationInput =
            sortKey === 'lastLogin' ? { lastLogin: sortDir }
                : sortKey === 'joinedAt' ? { createdAt: sortDir }
                    : sortKey === 'credits' ? { credits: sortDir }
                        : sortKey === 'classesAttended' ? { classAttendance: { _count: sortDir } }
                            : sortKey === 'totalSessions' ? { bookings: { _count: sortDir } }
                                : { createdAt: 'desc' };

        const [users, totalCount, activeCount, groupCount, therapyCount, mrrAgg] = await Promise.all([
            prisma.user.findMany({
                where,
                include: {
                    subscription: true,
                    _count: { select: { bookings: true, classAttendance: true } },
                },
                orderBy,
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.user.count({ where }),
            prisma.user.count({ where: liveWhere }),
            prisma.user.count({ where: { AND: [liveWhere, tabWhere.group] } }),
            prisma.user.count({ where: { AND: [liveWhere, tabWhere.therapy] } }),
            prisma.subscription.findMany({
                where: { status: 'ACTIVE', renewalDate: { gt: now }, user: { role: { not: 'VISITOR' } } },
                select: { amount: true, currency: true },
            }),
        ]);

        const ids = users.map((u) => u.id);
        const upcoming = ids.length
            ? await prisma.booking.groupBy({
                by: ['userId'],
                where: { userId: { in: ids }, status: { in: ['PENDING', 'CONFIRMED'] }, date: { gte: now } },
                _count: true,
                _min: { date: true },
            })
            : [];

        const upMap = new Map(
            upcoming.map((u) => [u.userId, { count: u._count, next: u._min.date as Date | null }]),
        );

        type Sub = (typeof users)[number]['subscription'];
        const isLive = (sub: Sub) =>
            !!sub &&
            (sub.status === 'ACTIVE' || sub.status === 'TRIAL') &&
            sub.renewalDate.getTime() > now.getTime();

        const rows = users.map((u) => {
            const sub = u.subscription;
            const up = upMap.get(u.id);
            const live = isLive(sub);
            return {
                id: u.id,
                name: u.name,
                email: u.email,
                phone: u.phone || '',
                country: u.country || '',
                avatarUrl: u.avatarUrl || '',
                role: u.role,
                planType: sub?.planType ?? (u.role === 'TRIAL' ? 'TRIAL' : null),
                plan: sub ? PLAN_LABEL[sub.planType] : u.role === 'TRIAL' ? 'Trial' : '—',
                amount: sub?.amount ?? 0,
                subStatus: sub?.status ?? null,
                status: live ? 'Active' : sub ? titleCase(sub.status) : 'Inactive',
                live,
                credits: u.credits,
                classesAttended: u._count.classAttendance,
                totalSessions: u._count.bookings,
                upcomingSessions: up?.count ?? 0,
                nextSession: up?.next ? fmtDateTime(up.next) : null,
                renewal: sub ? fmtDate(sub.renewalDate) : null,
                joinedAt: fmtDate(u.createdAt),
                lastLogin: u.lastLogin ? fmtDate(u.lastLogin) : 'Never',
            };
        });

        return NextResponse.json({
            members: rows,
            page,
            pageSize,
            totalCount,
            counts: {
                active: activeCount,
                group: groupCount,
                therapy: therapyCount,
                mrr: await sumAsInr(mrrAgg),
            },
        });
    } catch (error) {
        console.error('Admin members API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/admin/members — walk-in registration: create a member, activate
 * the plan they paid for, and record the cash/UPI/bank-transfer payment that
 * paid for it, in one step. Mirrors what checkout does for an online signup,
 * with `activatePlan`'s `provider: 'manual'` keeping this subscription out of
 * any automatic-renewal charge loop.
 */
export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const body = await readJson(request);
        const name = str(body.name, { label: 'Name', min: 1, max: 120 });
        const email = parseEmail(body.email, 'Email');
        const phone = optStr(body.phone, { label: 'Phone', max: 40 });

        const planKeyRaw = str(body.planKey, { label: 'Plan' });
        if (!isPlanKey(planKeyRaw)) throw new ValidationError('Unknown plan.');
        const plan = getPlan(planKeyRaw);

        const amount = Number(body.amount);
        if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError('Enter a valid amount.');
        const currency = String(body.currency || 'INR').toUpperCase().slice(0, 3);
        const method = oneOf(body.method, PAYMENT_METHODS, 'Payment method');
        const note = optStr(body.note, { label: 'Note', max: 200 });

        const result = await registerWalkInMember({ actor: admin, request, name, email, phone, plan, amount, currency, method, note });
        return NextResponse.json({ id: result.userId, tempPassword: result.tempPassword });
    } catch (error) {
        if (error instanceof ValidationError) return handleValidationError(error);
        if (error instanceof WalkInConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
        console.error('Admin members POST error:', error);
        return NextResponse.json({ error: 'Could not register the student.' }, { status: 500 });
    }
}
