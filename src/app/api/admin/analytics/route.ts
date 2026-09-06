import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    const rangeDays: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };
    const days = rangeDays[range] ?? 30;
    const rangeStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Query real data from database
    const [
      totalMembers,
      activeSubscriptions,
      trialUsers,
      subscriptions,
      usersByCountry,
      blogPosts
    ] = await Promise.all([
      prisma.user.count({
        where: { role: { in: ['MEMBER_EVERYDAY', 'MEMBER_THERAPY', 'TRIAL'] } }
      }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'TRIAL' } }),
      prisma.subscription.findMany({ where: { status: 'ACTIVE' } }),
      prisma.user.groupBy({
        by: ['country'],
        _count: true,
        where: { country: { not: null } }
      }),
      prisma.blogPost.findMany({
        where: { status: 'PUBLISHED' },
        select: { title: true },
        take: 5
      })
    ]);

    // Calculate MRR
    const mrr = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);

    // New members within the selected range, vs. the equivalent prior period.
    const priorRangeStart = new Date(rangeStart.getTime() - days * 24 * 60 * 60 * 1000);

    const newMembersThisMonth = await prisma.user.count({
      where: {
        role: { in: ['MEMBER_EVERYDAY', 'MEMBER_THERAPY'] },
        createdAt: { gte: rangeStart }
      }
    });

    const lastMonthNewMembers = await prisma.user.count({
      where: {
        role: { in: ['MEMBER_EVERYDAY', 'MEMBER_THERAPY'] },
        createdAt: { gte: priorRangeStart, lt: rangeStart }
      }
    });

    const newMembersGrowth = lastMonthNewMembers > 0
      ? ((newMembersThisMonth - lastMonthNewMembers) / lastMonthNewMembers) * 100
      : 0;

    // Revenue by month, scoped to the selected range (1-12 months of buckets).
    const monthsToShow = Math.min(12, Math.max(1, Math.ceil(days / 30)));
    const revenueRecords = await prisma.revenueRecord.findMany({
      where: {
        createdAt: { gte: rangeStart },
        status: 'SUCCESS'
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group revenue by month
    const revenueByMonth: { month: string; revenue: number }[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < monthsToShow; i++) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - (monthsToShow - 1 - i));
      const monthKey = monthNames[monthDate.getMonth()];
      const monthRevenue = revenueRecords
        .filter(r => r.createdAt.getMonth() === monthDate.getMonth() && r.createdAt.getFullYear() === monthDate.getFullYear())
        .reduce((sum, r) => sum + r.amount, 0);
      revenueByMonth.push({ month: monthKey, revenue: monthRevenue });
    }

    // Members by plan
    const everydayCount = await prisma.subscription.count({
      where: { planType: 'EVERYDAY_YOGA', status: 'ACTIVE' }
    });
    const therapyCount = await prisma.subscription.count({
      where: { planType: 'YOGA_THERAPY', status: 'ACTIVE' }
    });

    // Members by country
    const membersByCountry = usersByCountry.slice(0, 6).map(u => ({
      country: u.country || 'Others',
      count: u._count
    }));

    // Calculate conversion rate (leads converted / total leads)
    const totalLeads = await prisma.lead.count();
    const convertedLeads = await prisma.lead.count({ where: { status: 'CONVERTED' } });
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Calculate class attendance rate
    const recentClasses = await prisma.classInstance.findMany({
      where: {
        date: { gte: rangeStart }
      }
    });
    const totalAttendance = recentClasses.reduce((sum, c) => sum + c.attendanceCount, 0);
    const avgAttendance = recentClasses.length > 0 ? totalAttendance / recentClasses.length : 0;
    const classAttendanceRate = Math.min(100, Math.round((avgAttendance / 20) * 100)) || 0;

    // Top performing content. View counts require AnalyticsEvent instrumentation
    // on the blog pages, which doesn't exist yet - report 0 rather than inventing
    // numbers that would mislead whoever is reading this dashboard.
    const topPerformingContent = blogPosts.map((post) => ({
      title: post.title,
      views: 0
    })).slice(0, 3);

    return NextResponse.json({
      totalMembers,
      activeMembers: activeSubscriptions,
      trialUsers,
      mrr: Math.round(mrr),
      mrrGrowth: 0, // Would need historical MRR to calculate properly
      newMembersThisMonth,
      newMembersGrowth: Math.round(newMembersGrowth * 10) / 10,
      classAttendanceRate,
      attendanceChange: 0, // Would need historical data
      conversionRate: Math.round(conversionRate * 10) / 10,
      conversionChange: 0, // Would need historical data
      revenueByMonth,
      membersByPlan: [
        { plan: "Everyday Yoga", count: everydayCount },
        { plan: "Yoga Therapy", count: therapyCount }
      ],
      membersByCountry,
      topPerformingContent
    });
  } catch (error) {
    console.error('Admin analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
