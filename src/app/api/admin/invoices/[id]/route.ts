import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
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
        ? await prisma.payment.findUnique({ where: { id: invoice.paymentId }, select: { planKey: true, planType: true } })
        : null;

    const pdf = await renderInvoicePdf({
        number: invoice.number,
        issuedAt: invoice.issuedAt,
        memberName: invoice.user.name,
        memberEmail: invoice.user.email,
        lineItem: (payment?.planKey || payment?.planType || 'Shakti Yoga membership').replace(/_/g, ' '),
        amount: invoice.amountInr,
        tax: invoice.taxInr,
        currency: invoice.currency,
    });

    return new NextResponse(Buffer.from(pdf), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${invoice.number.replace(/\//g, '-')}.pdf"`,
        },
    });
}

/** PATCH /api/admin/invoices/:id { reason } — void an issued invoice. Doesn't touch the underlying payment. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await ctx.params;

    const body = await request.json().catch(() => ({}));
    const reason = String(body.reason || '').trim();
    if (!reason) return NextResponse.json({ error: 'A reason is required to void an invoice.' }, { status: 400 });

    const before = await prisma.invoice.findUnique({ where: { id }, select: { status: true, notes: true } });
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (before.status === 'VOID') return NextResponse.json({ error: 'Already void.' }, { status: 400 });

    const invoice = await prisma.invoice.update({
        where: { id },
        data: { status: 'VOID', notes: [before.notes, `Voided by ${admin.email}: ${reason}`].filter(Boolean).join('\n') },
    });

    await recordAudit({
        actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
        action: 'invoice.void', entity: 'Invoice', entityId: id,
        before: { status: before.status }, after: { status: invoice.status, reason },
    });

    return NextResponse.json({ id: invoice.id, status: invoice.status });
}
