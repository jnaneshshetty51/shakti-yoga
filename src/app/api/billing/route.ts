import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [subscription, payments, user] = await Promise.all([
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
        ]);

        return NextResponse.json({
            subscription,
            payments,
            credits: user?.credits ?? 0,
            role: user?.role ?? 'VISITOR',
        });
    } catch (error) {
        console.error('Billing API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
