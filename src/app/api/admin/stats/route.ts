import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
    try {
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const [users, subscriptions, bookings] = await Promise.all([
            prisma.user.findMany({
                include: {
                    subscription: true,
                },
            }),
            prisma.subscription.findMany({
                where: {
                    status: 'ACTIVE',
                },
            }),
            prisma.booking.findMany({
                where: {
                    status: 'PENDING',
                },
            }),
        ]);

        const activeMembers = users.filter(u =>
            u.subscription?.status === 'ACTIVE'
        ).length;

        const trialUsers = users.filter(u =>
            u.role === 'TRIAL' || u.subscription?.status === 'TRIAL'
        ).length;

        const mrr = subscriptions.reduce((acc, sub) => acc + sub.amount, 0);
        const pendingBookings = bookings.length;

        return NextResponse.json({
            activeMembers,
            trialUsers,
            mrr,
            pendingBookings,
        });
    } catch (error) {
        console.error('Admin stats API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

