import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { PaymentStatus, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const MAX_ROWS = 1000;

/** GET /api/admin/payments — row-level payment ledger, newest first. Read-only. */
export async function GET(request: Request) {
    if (!(await requireAdmin())) return forbidden();

    try {
        const url = new URL(request.url);
        const statusParam = url.searchParams.get('status');
        const provider = url.searchParams.get('provider');
        const q = url.searchParams.get('q')?.trim();
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        const limit = Math.min(MAX_ROWS, Math.max(1, Number(url.searchParams.get('limit')) || MAX_ROWS));

        const createdAt: Prisma.DateTimeFilter = {};
        if (from && !Number.isNaN(Date.parse(from))) createdAt.gte = new Date(from);
        if (to && !Number.isNaN(Date.parse(to))) createdAt.lte = new Date(to);

        const where: Prisma.PaymentWhereInput = {
            ...(statusParam && statusParam in PaymentStatus
                ? { status: statusParam as PaymentStatus }
                : {}),
            ...(provider ? { provider } : {}),
            ...(from || to ? { createdAt } : {}),
            ...(q
                ? {
                      user: {
                          OR: [
                              { name: { contains: q, mode: 'insensitive' } },
                              { email: { contains: q, mode: 'insensitive' } },
                          ],
                      },
                  }
                : {}),
        };

        const rows = await prisma.payment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { user: { select: { id: true, name: true, email: true } } },
        });

        return NextResponse.json({
            payments: rows.map((p) => ({
                id: p.id,
                member: p.user?.name ?? 'Unknown',
                email: p.user?.email ?? '',
                userId: p.userId,
                planType: p.planType,
                planKey: p.planKey,
                amount: p.amount,
                currency: p.currency,
                status: p.status,
                provider: p.provider,
                providerPaymentId: p.providerPaymentId ?? p.providerOrderId ?? '',
                creditApplied: p.creditApplied,
                refereeDiscountApplied: p.refereeDiscountApplied,
                createdAt: p.createdAt.toISOString(),
            })),
            capped: rows.length === limit,
        });
    } catch (error) {
        console.error('Admin payments GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
