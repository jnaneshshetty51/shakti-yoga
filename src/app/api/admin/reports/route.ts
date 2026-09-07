import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { liveSubWhere } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

const MONTHS = 12;

function monthKey(d: Date) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(key: string) {
    const [y, m] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export async function GET() {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date();
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1), 1));

    try {
        const [payments, users, subs, liveSubUserIds] = await Promise.all([
            prisma.payment.findMany({
                where: { status: 'PAID', createdAt: { gte: since } },
                select: { amount: true, createdAt: true, planType: true },
            }),
            prisma.user.findMany({
                where: { createdAt: { gte: since }, role: { in: ['MEMBER_EVERYDAY', 'MEMBER_THERAPY', 'TRIAL'] } },
                select: { id: true, createdAt: true },
            }),
            prisma.subscription.groupBy({ by: ['planType', 'status'], _count: { _all: true } }),
            prisma.subscription.findMany({ where: liveSubWhere(now), select: { userId: true } }),
        ]);

        // month scaffold
        const keys: string[] = [];
        for (let i = MONTHS - 1; i >= 0; i--) {
            keys.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
        }
        const zero = () => Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;

        const revenue = zero();
        for (const p of payments) {
            const k = monthKey(p.createdAt);
            if (k in revenue) revenue[k] += p.amount;
        }
        const signups = zero();
        for (const u of users) {
            const k = monthKey(u.createdAt);
            if (k in signups) signups[k] += 1;
        }

        // retention: of members who joined in month K, how many hold a live sub now
        const liveSet = new Set(liveSubUserIds.map((s) => s.userId));
        const cohortJoined = zero();
        const cohortRetained = zero();
        for (const u of users) {
            const k = monthKey(u.createdAt);
            if (!(k in cohortJoined)) continue;
            cohortJoined[k] += 1;
            if (liveSet.has(u.id)) cohortRetained[k] += 1;
        }

        const planMix = Object.values(
            subs.reduce<Record<string, { plan: string; active: number; total: number }>>((acc, row) => {
                const plan = row.planType.replace(/_/g, ' ').toLowerCase();
                acc[plan] ??= { plan, active: 0, total: 0 };
                acc[plan].total += row._count._all;
                if (row.status === 'ACTIVE' || row.status === 'TRIAL') acc[plan].active += row._count._all;
                return acc;
            }, {}),
        );

        const totalRevenue = Object.values(revenue).reduce((s, n) => s + n, 0);
        const totalSignups = Object.values(signups).reduce((s, n) => s + n, 0);
        const totalRetained = Object.values(cohortRetained).reduce((s, n) => s + n, 0);

        return NextResponse.json(
            {
                generatedAt: now.toISOString(),
                months: keys.map((k) => ({ key: k, label: monthLabel(k) })),
                revenueByMonth: keys.map((k) => ({ label: monthLabel(k), value: Math.round(revenue[k]) })),
                signupsByMonth: keys.map((k) => ({ label: monthLabel(k), value: signups[k] })),
                retention: keys.map((k) => ({
                    label: monthLabel(k),
                    joined: cohortJoined[k],
                    retained: cohortRetained[k],
                    rate: cohortJoined[k] ? Math.round((cohortRetained[k] / cohortJoined[k]) * 100) : null,
                })),
                planMix,
                summary: {
                    totalRevenue: Math.round(totalRevenue),
                    totalSignups,
                    overallRetention: totalSignups ? Math.round((totalRetained / totalSignups) * 100) : null,
                    liveSubscriptions: liveSet.size,
                },
            },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        console.error('Admin reports GET error:', error);
        return NextResponse.json({ error: 'Failed to build reports' }, { status: 500 });
    }
}
