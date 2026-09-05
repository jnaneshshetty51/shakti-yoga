import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    // TODO: actually filter the queries below by this range instead of always returning all-time data.
    const _range = searchParams.get('range') || '30d';

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

    // Get new members this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newMembersThisMonth = await prisma.user.count({
      where: {
        role: { in: ['MEMBER_EVERYDAY', 'MEMBER_THERAPY'] },
        createdAt: { gte: startOfMonth }
      }
    });

    // Get last month for growth calculation
    const lastMonthStart = new Date(startOfMonth);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthNewMembers = await prisma.user.count({
      where: {
        role: { in: ['MEMBER_EVERYDAY', 'MEMBER_THERAPY'] },
        createdAt: { gte: lastMonthStart, lt: startOfMonth }
      }
    });

    const newMembersGrowth = lastMonthNewMembers > 0
      ? ((newMembersThisMonth - lastMonthNewMembers) / lastMonthNewMembers) * 100
      : 0;

    // Get revenue by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const revenueRecords = await prisma.revenueRecord.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
        status: 'SUCCESS'
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group revenue by month
    const revenueByMonth: { month: string; revenue: number }[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 6; i++) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - (5 - i));
      const monthKey = monthNames[monthDate.getMonth()];
      const monthRevenue = revenueRecords
        .filter(r => r.createdAt.getMonth() === monthDate.getMonth())
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
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    });
    const totalAttendance = recentClasses.reduce((sum, c) => sum + c.attendanceCount, 0);
    const avgAttendance = recentClasses.length > 0 ? totalAttendance / recentClasses.length : 0;
    const classAttendanceRate = Math.min(100, Math.round((avgAttendance / 20) * 100)) || 0;

    // Top performing content (blog posts with view tracking - simplified)
    const topPerformingContent = blogPosts.map((post) => ({
      title: post.title,
      views: Math.floor(Math.random() * 1000) + 500 // Placeholder - would need AnalyticsEvent tracking
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
    return NextResponse.json({ error: 'Failed to fetch analytics', details: String(error) }, { status: 500 });
  }
}
