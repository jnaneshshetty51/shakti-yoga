import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { PLANS, isPlanKey } from '@/lib/pricing';
import { resolvedPlan } from '@/lib/plans';
import { activatePlan } from '@/lib/subscription';
import { SubscriptionStatus, PlanType, Role } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** The user role that should follow from a subscription's plan + status. */
function roleForSubscription(planType: PlanType, status: SubscriptionStatus): Role {
    const active = status === 'ACTIVE' || status === 'TRIAL' || status === 'PAUSED';
    if (!active) return Role.VISITOR;
    const plan = Object.values(PLANS).find((p) => p.dbPlanType === planType);
    return (plan?.role as Role) ?? Role.VISITOR;
}

export async function GET(request: Request) {
    try {
        const payload = await requireAdmin();
        if (!payload) return forbidden();

        const q = new URL(request.url).searchParams.get('q')?.trim();
        const statusFilter = new URL(request.url).searchParams.get('status');

        const subscriptions = await prisma.subscription.findMany({
            where: {
                ...(statusFilter && statusFilter in SubscriptionStatus
                    ? { status: statusFilter as SubscriptionStatus }
                    : {}),
                ...(q
                    ? { user: { OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { email: { contains: q, mode: 'insensitive' } },
                    ] } }
                    : {}),
            },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { renewalDate: 'asc' },
        });

        return NextResponse.json({
            subscriptions: subscriptions.map((sub) => ({
                id: sub.id,
                userId: sub.userId,
                userName: sub.user.name,
                userEmail: sub.user.email,
                plan: sub.planKey || sub.planType,
                planType: sub.planType,
                interval: sub.interval,
                amount: sub.amount,
                currency: sub.currency,
                status: sub.status,
                provider: sub.provider,
                paused: !!sub.pausedAt,
                renewalDate: sub.renewalDate.toISOString(),
            })),
        });
    } catch (error) {
        console.error('Admin subscriptions API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/** POST — manually activate a plan for a member (email + planKey). */
export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();

    try {
        const body = await request.json().catch(() => ({}));
        const email = String(body.email || '').trim().toLowerCase();
        const planKey = String(body.planKey || '');
        const amount = body.amount != null ? Number(body.amount) : undefined;

        if (!isPlanKey(planKey)) return NextResponse.json({ error: 'Pick a valid plan.' }, { status: 400 });
        const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (!user) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });

        const { user: updated } = await activatePlan(user.id, await resolvedPlan(planKey), {
            provider: 'razorpay',
            skipCookie: true,
            ...(amount != null && Number.isFinite(amount) ? { amount } : {}),
        });

        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'subscription.manual.activate', entity: 'Subscription', entityId: user.id,
            after: { planKey, amount, role: updated.role },
        });

        return NextResponse.json({ ok: true, userId: user.id });
    } catch (error) {
        console.error('Admin subscriptions POST error:', error);
        return NextResponse.json({ error: 'Could not activate the plan.' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    try {
        const { id, status, planType, renewalDate, amount, extendDays, pause, reason } =
            await request.json().catch(() => ({}));
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
        if (amount != null && Number.isFinite(Number(amount))) data.amount = Math.max(0, Number(amount));
        if (typeof extendDays === 'number' && extendDays !== 0) {
            const base = data.renewalDate instanceof Date ? data.renewalDate : before.renewalDate;
            data.renewalDate = new Date(base.getTime() + extendDays * 86_400_000);
        }
        if (pause === true) {
            data.status = SubscriptionStatus.PAUSED;
            data.pausedAt = new Date();
        } else if (pause === false) {
            data.status = SubscriptionStatus.ACTIVE;
            data.pausedAt = null;
        }

        const nextStatus = (data.status as SubscriptionStatus) ?? before.status;
        const nextPlan = (data.planType as PlanType) ?? before.planType;
        const nextRole = roleForSubscription(nextPlan, nextStatus);

        const [sub] = await prisma.$transaction([
            prisma.subscription.update({ where: { id }, data }),
            prisma.user.update({ where: { id: before.userId }, data: { role: nextRole } }),
        ]);

        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'subscription.update', entity: 'Subscription', entityId: id,
            before: { status: before.status, planType: before.planType, renewalDate: before.renewalDate, amount: before.amount },
            after: { status: sub.status, planType: sub.planType, renewalDate: sub.renewalDate, amount: sub.amount, userRole: nextRole, reason: reason ?? null },
        });

        return NextResponse.json({ subscription: { id: sub.id, status: sub.status } });
    } catch (error) {
        console.error('Admin subscriptions PATCH error:', error);
        return NextResponse.json({ error: 'Could not update subscription' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    try {
        const id = new URL(request.url).searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing subscription id' }, { status: 400 });
        const before = await prisma.subscription.findUnique({ where: { id }, select: { userId: true, planKey: true } });
        await prisma.subscription.delete({ where: { id } });
        if (before) {
            await recordAudit({
                actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
                action: 'subscription.delete', entity: 'Subscription', entityId: id, before,
            });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin subscriptions DELETE error:', error);
        return NextResponse.json({ error: 'Could not delete subscription' }, { status: 500 });
    }
}
