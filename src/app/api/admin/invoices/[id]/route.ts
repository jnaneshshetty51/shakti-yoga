import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { renderInvoicePdf } from '@/lib/invoice';

export const dynamic = 'force-dynamic';

/** GET /api/admin/invoices/:id — the invoice as a PDF. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await ctx.params;

    const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { user: { select: { name: true, email: true } } },
    });
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const payment = invoice.paymentId
        ? await prisma.payment.findUnique({ where: { id: invoice.paymentId }, select: { planKey: true, planType: true, currency: true } })
        : null;

    const pdf = await renderInvoicePdf({
        number: invoice.number,
        issuedAt: invoice.issuedAt,
        memberName: invoice.user.name,
        memberEmail: invoice.user.email,
        lineItem: (payment?.planKey || payment?.planType || 'Shakti Yoga membership').replace(/_/g, ' '),
        amount: invoice.amountInr,
        tax: invoice.taxInr,
        currency: payment?.currency || 'INR',
    });

    return new NextResponse(Buffer.from(pdf), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${invoice.number.replace(/\//g, '-')}.pdf"`,
        },
    });
}
