import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { issueInvoiceForPayment } from '@/lib/invoice';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** GET ?email= — invoices, newest first. */
export async function GET(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    const email = new URL(request.url).searchParams.get('email')?.trim().toLowerCase();

    const rows = await prisma.invoice.findMany({
        where: email ? { user: { email } } : {},
        include: { user: { select: { name: true, email: true } } },
        orderBy: { issuedAt: 'desc' },
        take: 200,
    });

    return NextResponse.json({
        invoices: rows.map((i) => ({
            id: i.id,
            number: i.number,
            member: i.user.name,
            email: i.user.email,
            amountInr: i.amountInr,
            currency: i.currency,
            taxInr: i.taxInr,
            status: i.status,
            issuedAt: i.issuedAt.toISOString(),
        })),
    });
}

/** POST — issue an invoice for a payment.  { paymentId } */
export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();

    const body = await request.json().catch(() => ({}));
    const paymentId = String(body.paymentId || '');
    if (!paymentId) return NextResponse.json({ error: 'paymentId is required.' }, { status: 400 });

    const invoice = await issueInvoiceForPayment(paymentId);
    if (!invoice) return NextResponse.json({ error: 'That payment is not eligible for an invoice.' }, { status: 400 });

    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: 'invoice.issue', entity: 'Invoice', entityId: invoice.id, after: { number: invoice.number, paymentId },
    });
    return NextResponse.json({ id: invoice.id, number: invoice.number });
}
