import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import {
    toRange,
    headlineStats,
    membersGained,
    revenueTotals,
    revenueSeries,
    signupSeries,
    trialFunnel,
    classFillRate,
} from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const range = toRange(new URL(request.url).searchParams.get('range'));
        const now = new Date();

        const [headline, gained, revenue, revSeries, signups, funnel, fill, byPlan, byCountry] =
            await Promise.all([
                headlineStats(now),
                membersGained(range, now),
                revenueTotals(range, now),
                revenueSeries(range, now),
                signupSeries(range, now),
                trialFunnel(range, now),
                classFillRate(range, now),
                prisma.subscription.groupBy({ by: ['planType'], where: { status: 'ACTIVE' }, _count: true }),
                prisma.user.groupBy({
                    by: ['country'],
                    where: { country: { not: null }, role: { in: ['MEMBER_EVERYDAY', 'MEMBER_THERAPY', 'TRIAL'] } },
                    _count: true,
                }),
            ]);

        const planCount = (t: string) => byPlan.find((p) => p.planType === t)?._count ?? 0;

        return NextResponse.json({
            range,
            generatedAt: now.toISOString(),
            // headline (range-independent point-in-time)
            activeMembers: headline.activeMembers,
            everydayMembers: headline.everydayMembers,
            therapyMembers: headline.therapyMembers,
            trialUsers: headline.trialUsers,
            mrr: headline.mrr,
            // range-scoped
            newMembers: gained.current,
            newMembersDelta: gained.delta,
            revenueCollected: revenue.current,
            revenueDelta: revenue.delta,
            conversionRate: funnel.conversionRate,
            classFill: fill,
            // series + breakdowns
            revenueSeries: revSeries,
            signupSeries: signups,
            trialFunnel: funnel,
            membersByPlan: [
                { plan: 'Everyday Yoga', count: planCount('EVERYDAY_YOGA') },
                { plan: 'Yoga Therapy', count: planCount('YOGA_THERAPY') },
            ],
            membersByCountry: byCountry
                .map((c) => ({ country: c.country || 'Unknown', count: c._count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 6),
        });
    } catch (error) {
        console.error('Admin analytics API error:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
