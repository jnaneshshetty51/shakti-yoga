import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || (payload.role !== 'SUPER_ADMIN' && payload.role !== 'STAFF_ADMIN')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const subscriptions = await prisma.subscription.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                renewalDate: 'asc',
            },
        });

        const formattedSubscriptions = subscriptions.map(sub => ({
            id: sub.id,
            userId: sub.userId,
            userName: sub.user.name,
            plan: sub.planType === 'EVERYDAY_YOGA' ? 'Everyday Yoga' :
                  sub.planType === 'YOGA_THERAPY' ? 'Yoga Therapy' : 'Trial',
            amount: sub.amount,
            status: sub.status === 'ACTIVE' ? 'Active' :
                    sub.status === 'TRIAL' ? 'Trial' :
                    sub.status === 'CANCELLED' ? 'Cancelled' : 'Paused',
            renewalDate: formatDate(sub.renewalDate),
        }));

        return NextResponse.json({ subscriptions: formattedSubscriptions });
    } catch (error) {
        console.error('Admin subscriptions API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    }).format(date);
}

