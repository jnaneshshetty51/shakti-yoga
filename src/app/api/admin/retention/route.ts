import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { resolveSegment } from '@/lib/push-segments';
import { Role, SubscriptionStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });
const DAY = 86_400_000;

async function hydrate(ids: string[], limit = 50) {
    const rows = await prisma.user.findMany({
        where: { id: { in: ids.slice(0, limit) } },
        select: {
            id: true, name: true, email: true, lastLogin: true,
            subscription: { select: { planType: true, status: true, renewalDate: true } },
        },
    });
    return rows.map((u) => ({
        id: u.id, name: u.name, email: u.email,
        lastLogin: u.lastLogin?.toISOString() ?? null,
        plan: u.subscription?.planType ?? null,
        renewal: u.subscription?.renewalDate.toISOString() ?? null,
    }));
}

/** GET — the at-risk board: lapsed, inactive-in-app, renewal-soon, failed-payment. */
export async function GET() {
    if (!(await requireAdmin())) return forbidden();
    const now = new Date();

    const [lapsedIds, atRiskIds] = await Promise.all([
        resolveSegment('inactive'),
        resolveSegment('at_risk'),
    ]);

    const renewalSoon = await prisma.user.findMany({
        where: {
            role: { in: [Role.MEMBER_EVERYDAY, Role.MEMBER_STARTER, Role.MEMBER_THERAPY] },
            subscription: {
                status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
                renewalDate: { gt: now, lt: new Date(now.getTime() + 7 * DAY) },
            },
        },
        select: { id: true },
    });

    const failedPayers = await prisma.payment.findMany({
        where: { status: 'FAILED', createdAt: { gte: new Date(now.getTime() - 14 * DAY) } },
        select: { userId: true },
        distinct: ['userId'],
    });

    const [lapsed, atRisk, renewing, failed] = await Promise.all([
        hydrate(lapsedIds),
        hydrate(atRiskIds),
        hydrate(renewalSoon.map((u) => u.id)),
        hydrate(failedPayers.map((p) => p.userId)),
    ]);

    return NextResponse.json({
        segments: [
            { key: 'inactive', label: 'Membership lapsed', total: lapsedIds.length, members: lapsed },
            { key: 'at_risk', label: 'No class in 14 days', total: atRiskIds.length, members: atRisk },
            { key: 'renewing', label: 'Renews within 7 days', total: renewalSoon.length, members: renewing },
            { key: 'failed', label: 'Payment failed (14d)', total: failedPayers.length, members: failed },
        ],
    });
}
