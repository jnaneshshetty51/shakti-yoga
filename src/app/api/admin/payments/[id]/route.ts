import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { refundPayment, isRazorpayConfigured } from '@/lib/razorpay';
import { PaymentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** POST /api/admin/payments/:id  { action: "refund", amount? } */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    const { id } = await ctx.params;

    const body = await request.json().catch(() => ({}));
    if (body.action !== 'refund') {
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.status !== PaymentStatus.PAID) {
        return NextResponse.json({ error: `Only PAID payments can be refunded (this one is ${payment.status}).` }, { status: 409 });
    }

    const amount = body.amount != null ? Number(body.amount) : undefined;
    if (amount != null && (!Number.isFinite(amount) || amount <= 0 || amount > payment.amount)) {
        return NextResponse.json({ error: 'Invalid refund amount.' }, { status: 400 });
    }
    const full = amount == null || amount >= payment.amount;

    try {
        if (payment.provider === 'razorpay' && payment.providerPaymentId) {
            if (!isRazorpayConfigured()) {
                return NextResponse.json({ error: 'Razorpay is not configured on this server.' }, { status: 503 });
            }
            await refundPayment(payment.providerPaymentId, full ? undefined : amount);
        }
        // manual / store payments: no external call — just record the state change.

        const updated = await prisma.payment.update({
            where: { id },
            data: full ? { status: PaymentStatus.REFUNDED } : {},
        });

        await auditAs({ id: admin.id, email: admin.email }, request)({
            action: 'payment.refund',
            entity: 'Payment',
            entityId: id,
            before: { status: payment.status, amount: payment.amount },
            after: { refunded: full ? payment.amount : amount, partial: !full },
        });

        return NextResponse.json({ ok: true, status: updated.status, partial: !full });
    } catch (error) {
        console.error('Refund error:', error);
        const message = error instanceof Error && error.message.length < 200 ? error.message : 'Refund failed at the payment provider.';
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
