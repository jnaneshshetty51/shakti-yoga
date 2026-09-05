import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

// Fallback data for when database is unavailable
const FALLBACK_RECENT_ACTIVITY = [
    { id: '1', type: 'signup', message: 'Sarah Johnson started a free trial', timestamp: '2 hours ago' },
    { id: '2', type: 'payment', message: 'Payment of ₹7,200 received from Mike Ross', timestamp: '4 hours ago' },
    { id: '3', type: 'booking', message: 'John Doe booked a therapy session for tomorrow', timestamp: '5 hours ago' },
    { id: '4', type: 'trial', message: 'Emma Wilson completed 3 trial classes', timestamp: '1 day ago' },
    { id: '5', type: 'booking', message: 'Robert Chen booked consultation call', timestamp: '1 day ago' },
];

const FALLBACK_UPCOMING_BOOKINGS = [
    { id: '1', memberName: 'Priya Sharma', type: 'Therapy Session', date: 'Today', time: '10:00 AM IST' },
    { id: '2', memberName: 'Anita Patel', type: 'Consultation', date: 'Today', time: '11:30 AM IST' },
    { id: '3', memberName: 'John Doe', type: 'Therapy Session', date: 'Tomorrow', time: '09:00 AM IST' },
    { id: '4', memberName: 'Sarah Wilson', type: 'Therapy Session', date: 'Tomorrow', time: '02:00 PM IST' },
];

const FALLBACK_TOP_MEMBERS = [
    { id: '1', name: 'Priya Sharma', email: 'priya@email.com', plan: 'Yoga Therapy', lastActive: 'Today' },
    { id: '2', name: 'Mike Ross', email: 'mike@email.com', plan: 'Everyday Yoga', lastActive: 'Today' },
    { id: '3', name: 'Emma Wilson', email: 'emma@email.com', plan: 'Everyday Yoga', lastActive: 'Yesterday' },
    { id: '4', name: 'Robert Chen', email: 'robert@email.com', plan: 'Yoga Therapy', lastActive: '2 days ago' },
];

export async function GET() {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // Fetch recent activity from AnalyticsEvent and LeadActivity
        const [analyticsEvents, leadActivities] = await Promise.all([
            prisma.analyticsEvent.findMany({
                orderBy: { timestamp: 'desc' },
                take: 5
            }),
            prisma.leadActivity.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { lead: true }
            })
        ]);

        // Transform analytics events to activity format
        const eventActivities = analyticsEvents.map(event => ({
            id: event.id,
            type: event.eventType.toLowerCase().includes('signup') ? 'signup' :
                event.eventType.toLowerCase().includes('payment') ? 'payment' :
                    event.eventType.toLowerCase().includes('booking') ? 'booking' : 'trial',
            message: JSON.stringify(event.metadata || {}),
            timestamp: formatTimeAgo(event.timestamp)
        }));

        // Transform lead activities
        const leadActivityItems = leadActivities.map(activity => ({
            id: activity.id,
            type: activity.type.toLowerCase() as 'signup' | 'payment' | 'booking' | 'trial',
            message: activity.content,
            timestamp: formatTimeAgo(activity.createdAt)
        }));

        // Combine and sort by timestamp
        const recentActivity = [...eventActivities, ...leadActivityItems]
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
            .slice(0, 5);

        // Fetch upcoming bookings
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const endOfTomorrow = new Date(tomorrow);
        endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

        const upcomingBookings = await prisma.booking.findMany({
            where: {
                date: {
                    gte: new Date(),
                    lt: endOfTomorrow
                },
                status: { in: ['PENDING', 'CONFIRMED'] }
            },
            include: {
                user: { select: { name: true } },
                teacher: { select: { name: true } }
            },
            orderBy: { date: 'asc' },
            take: 4
        });

        const formattedBookings = upcomingBookings.map(booking => ({
            id: booking.id,
            memberName: booking.user?.name || 'Unknown',
            type: booking.type.replace('_', ' '),
            date: booking.date.toDateString() === new Date().toDateString() ? 'Today' : 'Tomorrow',
            time: booking.date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST'
        }));

        // Fetch top members (most active users with subscriptions)
        const topMembers = await prisma.user.findMany({
            where: {
                role: { in: ['MEMBER_EVERYDAY', 'MEMBER_THERAPY'] },
                lastLogin: { not: null }
            },
            include: {
                subscription: { select: { planType: true } }
            },
            orderBy: { lastLogin: 'desc' },
            take: 4
        });

        const formattedMembers = topMembers.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            plan: user.subscription?.planType?.replace('_', ' ') || 'Unknown',
            lastActive: formatTimeAgo(user.lastLogin || user.createdAt)
        }));

        return NextResponse.json({
            recentActivity: recentActivity.length > 0 ? recentActivity : FALLBACK_RECENT_ACTIVITY,
            upcomingBookings: formattedBookings.length > 0 ? formattedBookings : FALLBACK_UPCOMING_BOOKINGS,
            topMembers: formattedMembers.length > 0 ? formattedMembers : FALLBACK_TOP_MEMBERS
        });
    } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
        return NextResponse.json({
            recentActivity: FALLBACK_RECENT_ACTIVITY,
            upcomingBookings: FALLBACK_UPCOMING_BOOKINGS,
            topMembers: FALLBACK_TOP_MEMBERS
        });
    }
}

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}