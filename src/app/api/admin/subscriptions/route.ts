import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { PLANS } from '@/lib/pricing';
import { SubscriptionStatus, PlanType, Role } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** The user role that should follow from a subscription's plan + status. */
function roleForSubscription(planType: PlanType, status: SubscriptionStatus): Role {
    const active = status === 'ACTIVE' || status === 'TRIAL' || status === 'PAUSED';
    if (!active) return Role.VISITOR;
    const plan = Object.values(PLANS).find(p => p.dbPlanType === planType);
    return (plan?.role as Role) ?? Role.VISITOR;
}

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
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    try {
        const { id, status, planType, renewalDate } = await request.json().catch(() => ({}));
        if (!id) return NextResponse.json({ error: 'Missing subscription id' }, { status: 400 });

        if (status && !(status in SubscriptionStatus)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
        if (planType && !(planType in PlanType)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        const before = await prisma.subscription.findUnique({ where: { id } });
        if (!before) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

        const data: Record<string, unknown> = {};
        if (status) data.status = status as SubscriptionStatus;
        if (planType) data.planType = planType as PlanType;
        if (renewalDate) data.renewalDate = new Date(renewalDate);

        const nextStatus = (data.status as SubscriptionStatus) ?? before.status;
        const nextPlan = (data.planType as PlanType) ?? before.planType;
        const nextRole = roleForSubscription(nextPlan, nextStatus);

        // Keep User.role in step with the subscription — a manual edit to ACTIVE
        // must actually grant access, and to CANCELLED/EXPIRED must revoke it.
        const [sub] = await prisma.$transaction([
            prisma.subscription.update({ where: { id }, data }),
            prisma.user.update({ where: { id: before.userId }, data: { role: nextRole } }),
        ]);

        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'subscription.update', entity: 'Subscription', entityId: id,
            before: { status: before.status, planType: before.planType, renewalDate: before.renewalDate },
            after: { status: sub.status, planType: sub.planType, renewalDate: sub.renewalDate, userRole: nextRole },
        });

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

