import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

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

/**
 * Segmented member roster for the admin.
 *   active  — anyone on a live subscription (ACTIVE or TRIAL, not past renewal)
 *   group   — active members entitled to the daily group class (Everyday + Trial)
 *   therapy — active members on the 1:1 track (Yoga Therapy, or holding credits)
 */
export async function GET() {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const now = new Date();

        const [users, upcoming] = await Promise.all([
            prisma.user.findMany({
                where: { role: { not: 'VISITOR' } },
                include: {
                    subscription: true,
                    _count: { select: { bookings: true, classAttendance: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.booking.groupBy({
                by: ['userId'],
                where: { status: { in: ['PENDING', 'CONFIRMED'] }, date: { gte: now } },
                _count: true,
                _min: { date: true },
            }),
        ]);

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

        const active = rows.filter((r) => r.live);
        const group = active.filter(
            (r) => r.planType === 'EVERYDAY_YOGA' || r.planType === 'TRIAL' || r.role === 'TRIAL',
        );
        const therapy = active.filter(
            (r) => r.planType === 'YOGA_THERAPY' || r.role === 'MEMBER_THERAPY' || r.credits > 0,
        );

        const mrr = active
            .filter((r) => r.subStatus === 'ACTIVE')
            .reduce((sum, r) => sum + r.amount, 0);

        return NextResponse.json({
            active,
            group,
            therapy,
            counts: {
                active: active.length,
                group: group.length,
                therapy: therapy.length,
                mrr,
            },
        });
    } catch (error) {
        console.error('Admin members API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
