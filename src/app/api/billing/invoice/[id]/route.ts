import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { PLANS } from '@/lib/pricing';
import type { PlanType } from '@prisma/client';

const PLAN_NAME: Record<PlanType, string> = {
    EVERYDAY_YOGA: PLANS.everyday.name,
    YOGA_THERAPY: PLANS.therapy.name,
    TRIAL: PLANS.trial.name,
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await ctx.params;

    const payment = await prisma.payment.findUnique({
        where: { id },
        include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!payment || payment.userId !== session.id) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (payment.status !== 'PAID') {
        return NextResponse.json({ error: 'No invoice for an unpaid transaction' }, { status: 409 });
    }

    return NextResponse.json({
        invoice: {
            number: `SY-${payment.createdAt.getFullYear()}-${payment.id.slice(-8).toUpperCase()}`,
            date: payment.createdAt.toISOString(),
            billedTo: { name: payment.user.name, email: payment.user.email },
            lineItem: `${PLAN_NAME[payment.planType]} — subscription`,
            amount: payment.amount,
            currency: payment.currency,
            reference: payment.providerPaymentId ?? payment.providerOrderId ?? payment.id,
            provider: payment.provider,
        },
    });
}
