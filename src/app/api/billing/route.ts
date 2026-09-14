import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getSessionBalance } from '@/lib/sessionCredits';

export async function GET() {
    try {
        const payload = await getSession();
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [subscription, payments, user, sessionCredits] = await Promise.all([
            prisma.subscription.findUnique({ where: { userId: payload.id } }),
            prisma.payment.findMany({
                where: { userId: payload.id },
                orderBy: { createdAt: 'desc' },
                take: 24,
                select: {
                    id: true,
                    amount: true,
                    currency: true,
                    status: true,
                    planType: true,
                    provider: true,
                    providerPaymentId: true,
                    createdAt: true,
                },
            }),
            prisma.user.findUnique({ where: { id: payload.id }, select: { credits: true, role: true } }),
            // null for uncapped plans (annual, Starter, Therapy) — only capped
            // monthly Everyday/Family plans have a per-cycle group-class balance.
            getSessionBalance(payload.id),
        ]);

        return NextResponse.json({
            subscription,
            payments,
            credits: user?.credits ?? 0,
            sessionCredits,
            role: user?.role ?? 'VISITOR',
        });
    } catch (error) {
        console.error('Billing API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
