import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { prisma } from '@/lib/prisma';

/** Indian financial year label for a date, e.g. "2026-27". */
function financialYear(d: Date): string {
    const y = d.getUTCFullYear();
    const startYear = d.getUTCMonth() >= 3 ? y : y - 1; // Apr = month 3
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/** The next sequential invoice number, "SYK/2026-27/000042". */
export async function nextInvoiceNumber(now = new Date()): Promise<string> {
    const fy = financialYear(now);
    const prefix = `SYK/${fy}/`;
    const count = await prisma.invoice.count({ where: { number: { startsWith: prefix } } });
    return `${prefix}${String(count + 1).padStart(6, '0')}`;
}

/**
 * Create an Invoice row for a paid payment (idempotent — one per payment).
 * Returns the invoice, or null if the payment isn't eligible.
 */
export async function issueInvoiceForPayment(paymentId: string): Promise<{ id: string; number: string } | null> {
    const existing = await prisma.invoice.findFirst({ where: { paymentId }, select: { id: true, number: true } });
    if (existing) return existing;

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.status !== 'PAID') return null;

    const sub = await prisma.subscription.findUnique({ where: { userId: payment.userId }, select: { id: true } });
    const number = await nextInvoiceNumber(payment.createdAt);

    const invoice = await prisma.invoice.create({
        data: {
            number,
            userId: payment.userId,
            paymentId: payment.id,
            subscriptionId: sub?.id ?? null,
            amountInr: payment.currency === 'INR' ? payment.amount : payment.amount,
            taxInr: 0,
            status: 'PAID',
        },
        select: { id: true, number: true },
    });
    return invoice;
}

/** Render a one-page A4 tax invoice PDF. */
export async function renderInvoicePdf(input: {
    number: string;
    issuedAt: Date;
    memberName: string;
    memberEmail: string;
    lineItem: string;
    amount: number;
    tax: number;
    currency: string;
}): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]); // A4 portrait
    const { width, height } = page.getSize();
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const sans = await doc.embedFont(StandardFonts.Helvetica);
    const brand = rgb(0.29, 0.4, 0.25);
    const ink = rgb(0.15, 0.15, 0.15);
    const subtle = rgb(0.45, 0.45, 0.45);
    const M = 50;
    let y = height - M;

    const text = (s: string, x: number, yy: number, font = sans, size = 10, color = ink) =>
        page.drawText(s, { x, y: yy, size, font, color });

    text('SHAKTI YOGA KENDRA', M, y, bold, 16, brand);
    text('TAX INVOICE', width - M - bold.widthOfTextAtSize('TAX INVOICE', 14), y, bold, 14, ink);
    y -= 18;
    text('shaktiyoga.in', M, y, sans, 9, subtle);
    y -= 40;

    text(`Invoice no: ${input.number}`, M, y, bold, 10);
    text(`Date: ${input.issuedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, width - M - 180, y, sans, 10);
    y -= 30;

    text('Billed to', M, y, bold, 10);
    y -= 15;
    text(input.memberName, M, y);
    y -= 13;
    text(input.memberEmail, M, y, sans, 9, subtle);
    y -= 40;

    // Table
    page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1, color: subtle });
    y -= 16;
    text('Description', M, y, bold, 10);
    text('Amount', width - M - 80, y, bold, 10);
    y -= 8;
    page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.5, color: subtle });
    y -= 20;

    const fmt = (n: number) => `${input.currency} ${n.toLocaleString('en-IN')}`;
    text(input.lineItem, M, y);
    text(fmt(input.amount - input.tax), width - M - 80, y);
    y -= 18;
    if (input.tax > 0) {
        text('GST', M, y, sans, 9, subtle);
        text(fmt(input.tax), width - M - 80, y, sans, 9, subtle);
        y -= 18;
    }
    page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.5, color: subtle });
    y -= 20;
    text('Total', M, y, bold, 11);
    text(fmt(input.amount), width - M - 80, y, bold, 11);
    y -= 60;

    text('Payment received. This is a computer-generated invoice.', M, y, sans, 8, subtle);

    return doc.save();
}
