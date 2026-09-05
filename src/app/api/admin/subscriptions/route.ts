import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/admin-auth';
import { SubscriptionStatus, PlanType } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || payload.role !== 'admin') {
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

export async function PATCH(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    try {
        const { id, status, planType, renewalDate } = await request.json().catch(() => ({}));
        if (!id) return NextResponse.json({ error: 'Missing subscription id' }, { status: 400 });

        if (status && !(status in SubscriptionStatus)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
        if (planType && !(planType in PlanType)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        const data: Record<string, unknown> = {};
        if (status) data.status = status as SubscriptionStatus;
        if (planType) data.planType = planType as PlanType;
        if (renewalDate) data.renewalDate = new Date(renewalDate);

        const sub = await prisma.subscription.update({ where: { id }, data });
        return NextResponse.json({ subscription: { id: sub.id, status: sub.status } });
    } catch (error) {
        console.error('Admin subscriptions PATCH error:', error);
        return NextResponse.json({ error: 'Could not update subscription' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    try {
        const id = new URL(request.url).searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing subscription id' }, { status: 400 });
        await prisma.subscription.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin subscriptions DELETE error:', error);
        return NextResponse.json({ error: 'Could not delete subscription' }, { status: 500 });
    }
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

