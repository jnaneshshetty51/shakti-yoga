import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { issueInvoiceForPayment } from '@/lib/invoice';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/** GET ?email=&q=&page=&pageSize= — invoices, newest first. */
export async function GET(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    const url = new URL(request.url);
    const email = url.searchParams.get('email')?.trim().toLowerCase();
    const q = url.searchParams.get('q')?.trim();
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE));

    const where: Prisma.InvoiceWhereInput = {
        ...(email ? { user: { email } } : {}),
        ...(q
            ? {
                  OR: [
                      { number: { contains: q, mode: 'insensitive' } },
                      { user: { name: { contains: q, mode: 'insensitive' } } },
                      { user: { email: { contains: q, mode: 'insensitive' } } },
                  ],
              }
            : {}),
    };

    const [rows, totalCount] = await Promise.all([
        prisma.invoice.findMany({
            where,
            include: { user: { select: { name: true, email: true } } },
            orderBy: { issuedAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.invoice.count({ where }),
    ]);

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
        page,
        pageSize,
        totalCount,
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
