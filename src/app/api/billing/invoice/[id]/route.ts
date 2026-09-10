import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { PLANS } from '@/lib/pricing';
import { issueInvoiceForPayment, renderInvoicePdf } from '@/lib/invoice';
import type { PlanType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const PLAN_NAME: Record<PlanType, string> = {
    EVERYDAY_YOGA: PLANS.everyday.name,
    YOGA_THERAPY: PLANS.therapy.name,
    STARTER: PLANS.starter.name,
    FAMILY: PLANS.family.name,
    TRIAL: PLANS.trial.name,
};

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
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

    // Use the real numbered Invoice row — issue one lazily for older payments.
    let invoiceRow = await prisma.invoice.findFirst({ where: { paymentId: payment.id } });
    if (!invoiceRow) {
        await issueInvoiceForPayment(payment.id).catch(() => {});
        invoiceRow = await prisma.invoice.findFirst({ where: { paymentId: payment.id } });
    }

    const number =
        invoiceRow?.number ?? `SY-${payment.createdAt.getFullYear()}-${payment.id.slice(-8).toUpperCase()}`;
    const issuedAt = invoiceRow?.issuedAt ?? payment.createdAt;
    const amount = invoiceRow?.amountInr ?? payment.amount;
    const tax = invoiceRow?.taxInr ?? 0;
    const lineItem = `${PLAN_NAME[payment.planType]} — subscription`;

    if (new URL(req.url).searchParams.get('format') === 'pdf') {
        const pdf = await renderInvoicePdf({
            number,
            issuedAt,
            memberName: payment.user.name,
            memberEmail: payment.user.email,
            lineItem,
            amount,
            tax,
            currency: payment.currency,
        });
        return new NextResponse(Buffer.from(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${number.replace(/\//g, '-')}.pdf"`,
            },
        });
    }

    return NextResponse.json({
        invoice: {
            number,
            date: issuedAt.toISOString(),
            billedTo: { name: payment.user.name, email: payment.user.email },
            lineItem,
            amount,
            tax,
            currency: payment.currency,
            reference: payment.providerPaymentId ?? payment.providerOrderId ?? payment.id,
            provider: payment.provider,
        },
    });
}
