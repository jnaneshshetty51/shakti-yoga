import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { SubscriptionStatus, PlanType, Role, Prisma } from '@prisma/client';

/**
 * RESUME/EXTEND read renewalDate then write it back — a classic lost-update race under
 * concurrent calls for the same subscription. Serializable isolation makes Postgres abort
 * the loser instead of silently overwriting; retry it once since it's a genuine conflict,
 * not a bug.
 */
async function withSerializableRetry<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        try {
            return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        } catch (err) {
            const isSerializationFailure = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';
            if (isSerializationFailure && attempt < 1) continue;
            throw err;
        }
    }
}

export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    if (!body || !body.action) {
        return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id },
        include: { subscription: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const sub = user.subscription;
    if (!sub && body.action !== 'CREATE') {
        return NextResponse.json({ error: 'User does not have an active subscription' }, { status: 400 });
    }

    const { action, days, reason, targetPlanType, targetPlanKey } = body;

    if (action === 'PAUSE') {
        const pauseDate = new Date();
        const updated = await prisma.subscription.update({
            where: { id: sub!.id },
            data: {
                pausedAt: pauseDate,
                status: SubscriptionStatus.PAUSED,
            },
        });

        await prisma.auditLog.create({
            data: {
                actorId: admin.id,
                actorEmail: admin.email,
                action: 'subscription.pause',
                entity: 'Subscription',
                entityId: sub!.id,
                before: { status: sub!.status, pausedAt: sub!.pausedAt },
                after: { status: 'PAUSED', pausedAt: pauseDate.toISOString(), reason: reason || 'Member freeze' },
            },
        });

        return NextResponse.json({ success: true, subscription: updated });
    }

    if (action === 'RESUME') {
        const updated = await withSerializableRetry(async (tx) => {
            const fresh = await tx.subscription.findUniqueOrThrow({ where: { id: sub!.id } });
            const newRenewal = new Date(fresh.renewalDate);
            if (fresh.pausedAt) {
                const pausedDurationMs = Date.now() - new Date(fresh.pausedAt).getTime();
                const pausedDays = Math.max(1, Math.round(pausedDurationMs / (1000 * 60 * 60 * 24)));
                newRenewal.setDate(newRenewal.getDate() + pausedDays);
            }

            const result = await tx.subscription.update({
                where: { id: fresh.id },
                data: {
                    pausedAt: null,
                    status: SubscriptionStatus.ACTIVE,
                    renewalDate: newRenewal,
                },
            });

            await tx.auditLog.create({
                data: {
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: 'subscription.resume',
                    entity: 'Subscription',
                    entityId: fresh.id,
                    before: { status: fresh.status, renewalDate: fresh.renewalDate },
                    after: { status: 'ACTIVE', renewalDate: newRenewal.toISOString(), reason: reason || 'Member unfreeze' },
                },
            });

            return result;
        });

        return NextResponse.json({ success: true, subscription: updated });
    }

    if (action === 'EXTEND') {
        const addDays = Number(days);
        if (!addDays || addDays <= 0) {
            return NextResponse.json({ error: 'Valid number of extension days required' }, { status: 400 });
        }

        const updated = await withSerializableRetry(async (tx) => {
            const fresh = await tx.subscription.findUniqueOrThrow({ where: { id: sub!.id } });
            const currentRenewal = new Date(fresh.renewalDate);
            const newRenewal = new Date(currentRenewal);
            newRenewal.setDate(newRenewal.getDate() + addDays);

            const result = await tx.subscription.update({
                where: { id: fresh.id },
                data: {
                    renewalDate: newRenewal,
                    status: SubscriptionStatus.ACTIVE,
                },
            });

            await tx.auditLog.create({
                data: {
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: 'subscription.extend',
                    entity: 'Subscription',
                    entityId: fresh.id,
                    before: { renewalDate: currentRenewal.toISOString() },
                    after: { renewalDate: newRenewal.toISOString(), addedDays: addDays, reason: reason || 'Validity grant' },
                },
            });

            return result;
        });

        return NextResponse.json({ success: true, subscription: updated });
    }

    if (action === 'SWITCH_TRACK') {
        if (!targetPlanType || !(targetPlanType in PlanType)) {
            return NextResponse.json({ error: 'Valid target PlanType is required' }, { status: 400 });
        }

        const isTherapy = targetPlanType === PlanType.YOGA_THERAPY;
        const newRole = isTherapy ? Role.MEMBER_THERAPY : Role.MEMBER_EVERYDAY;

        // planType and role must move together — a Promise.all here can leave the member
        // split-brained (right plan, wrong role or vice versa) if one write fails.
        const [updatedSub] = await prisma.$transaction([
            prisma.subscription.update({
                where: { id: sub!.id },
                data: {
                    planType: targetPlanType as PlanType,
                    planKey: targetPlanKey || (isTherapy ? 'therapy_monthly' : 'everyday_monthly'),
                },
            }),
            prisma.user.update({
                where: { id },
                data: { role: newRole },
            }),
        ]);

        await prisma.auditLog.create({
            data: {
                actorId: admin.id,
                actorEmail: admin.email,
                action: 'subscription.track_switch',
                entity: 'Subscription',
                entityId: sub!.id,
                before: { planType: sub!.planType, planKey: sub!.planKey, role: user.role },
                after: { planType: targetPlanType, planKey: targetPlanKey, role: newRole, reason },
            },
        });

        return NextResponse.json({ success: true, subscription: updatedSub });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
