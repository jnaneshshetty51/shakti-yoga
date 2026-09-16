import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { issueInvoiceForPayment } from '@/lib/invoice';
import { activatePlan } from '@/lib/subscription';
import { getPlan, isPlanKey } from '@/lib/pricing';
import { PaymentStatus, PlanType, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];
const isPaymentMethod = (v: unknown): v is PaymentMethod => PAYMENT_METHODS.includes(v as PaymentMethod);

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

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
        const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE));

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

        const [rows, totalCount] = await Promise.all([
            prisma.payment.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: { user: { select: { id: true, name: true, email: true } } },
            }),
            prisma.payment.count({ where }),
        ]);

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
                refundedAmount: Number(p.refundedAmount),
                createdAt: p.createdAt.toISOString(),
            })),
            page,
            pageSize,
            totalCount,
        });
    } catch (error) {
        console.error('Admin payments GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/** POST /api/admin/payments — record an off-platform payment (cash / bank transfer). */
export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();

    try {
        const body = await request.json().catch(() => ({}));
        const email = String(body.email || '').trim().toLowerCase();
        let userId = String(body.userId || '');
        if (!userId && email) {
            const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
            userId = u?.id ?? '';
        }
        const amount = Number(body.amount);
        const currency = String(body.currency || 'INR').toUpperCase().slice(0, 3);
        const note = body.note ? String(body.note).slice(0, 200) : null;
        const method = isPaymentMethod(body.method) ? body.method : null;
        // A recognized plan key (e.g. 'everyday_annual') is the precise ladder rung and
        // takes over from the coarser planType select; falls back to it for older callers.
        const planKeyRaw = body.planKey ? String(body.planKey) : null;
        const plan = planKeyRaw && isPlanKey(planKeyRaw) ? getPlan(planKeyRaw) : null;
        const planTypeRaw = String(body.planType || '').toUpperCase();
        const planType = plan ? plan.dbPlanType : planTypeRaw in PlanType ? (planTypeRaw as PlanType) : PlanType.EVERYDAY_YOGA;
        const planKey = plan ? plan.key : planKeyRaw ? planKeyRaw.slice(0, 40) : null;
        // Only renew when a real plan was picked — bookkeeping-only entries (no plan match) never touch the subscription.
        const renew = plan != null && (body.renew === true || body.renew === 'true');

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ error: 'Enter a valid amount.' }, { status: 400 });
        }

        const payment = await prisma.payment.create({
            data: {
                userId,
                planType,
                planKey,
                amount,
                currency,
                status: PaymentStatus.PAID,
                provider: method ?? 'manual',
                providerPaymentId: `${method ?? 'manual'}_${Date.now()}`,
            },
        });

        if (renew && plan) {
            await activatePlan(userId, plan, {
                provider: 'manual',
                recurring: false,
                skipCookie: true,
                amount,
                currency,
            });
        }

        await auditAs({ id: admin.id, email: admin.email }, request)({
            action: 'payment.manual.create',
            entity: 'Payment',
            entityId: payment.id,
            after: { userId, amount, currency, planType, planKey, method, renewed: renew, note },
        });
        void issueInvoiceForPayment(payment.id).catch(() => {});

        return NextResponse.json({ id: payment.id });
    } catch (error) {
        console.error('Admin payments POST error:', error);
        return NextResponse.json({ error: 'Could not record the payment.' }, { status: 500 });
    }
}
