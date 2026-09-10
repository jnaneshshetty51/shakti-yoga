import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    const { id } = await params;
    try {
        const body = await request.json().catch(() => ({}));
        const rewardMonths = Number(body.rewardMonths);
        if (!Number.isFinite(rewardMonths) || rewardMonths < 0 || rewardMonths > 24) {
            return NextResponse.json({ error: 'rewardMonths must be between 0 and 24' }, { status: 400 });
        }

        const before = await prisma.referral.findUnique({ where: { id } });
        if (!before) return NextResponse.json({ error: 'Referral not found' }, { status: 404 });

        const referral = await prisma.referral.update({
            where: { id },
            data: { rewardMonths: Math.trunc(rewardMonths) },
        });

        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'referral.reward.update', entity: 'Referral', entityId: id,
            before: { rewardMonths: before.rewardMonths },
            after: { rewardMonths: referral.rewardMonths },
        });

        return NextResponse.json({ referral: { id: referral.id, rewardMonths: referral.rewardMonths } });
    } catch (error) {
        console.error('Admin referral PATCH error:', error);
        return NextResponse.json({ error: 'Could not update referral' }, { status: 500 });
    }
}
