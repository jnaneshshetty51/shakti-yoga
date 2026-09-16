import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import type { SessionPayload } from '@/lib/auth';
import { activatePlan } from '@/lib/subscription';
import { issueInvoiceForPayment } from '@/lib/invoice';
import { auditAs } from '@/lib/audit';
import type { PlanConfig } from '@/lib/pricing';
import { PaymentStatus } from '@prisma/client';

export const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export class WalkInConflictError extends Error {}

/**
 * Register a walk-in member: create their login, activate the plan they paid
 * for (the same `activatePlan` path checkout uses, so renewal date/credits
 * match an online signup exactly), and record the cash/UPI/bank-transfer
 * payment that paid for it — all in one step.
 *
 * Shared by the full-admin "new student" flow (any plan, Students hub) and
 * the THERAPIST-scoped walk-in flow (Yoga Therapy plans only, Yoga Therapy
 * hub) — each route validates and restricts its own inputs before calling in.
 */
export async function registerWalkInMember(opts: {
    actor: Pick<SessionPayload, 'id' | 'email'>;
    request: Request;
    name: string;
    email: string;
    phone?: string;
    plan: PlanConfig;
    amount: number;
    currency: string;
    method: PaymentMethod;
    note?: string;
}): Promise<{ userId: string; tempPassword: string }> {
    const existing = await prisma.user.findUnique({ where: { email: opts.email }, select: { id: true } });
    if (existing) throw new WalkInConflictError('A user with this email already exists.');

    // Random password; shown once to the registering admin. The student can
    // also always set their own later via the public "Forgot password" flow.
    const tempPassword = randomBytes(9).toString('base64url');
    const passwordHash = await hashPassword(tempPassword);

    const user = await prisma.user.create({
        data: { name: opts.name, email: opts.email, passwordHash, phone: opts.phone ?? null, role: 'VISITOR' },
    });

    await activatePlan(user.id, opts.plan, {
        provider: 'manual',
        recurring: false,
        skipCookie: true,
        amount: opts.amount,
        currency: opts.currency,
    });

    const payment = await prisma.payment.create({
        data: {
            userId: user.id,
            planType: opts.plan.dbPlanType,
            planKey: opts.plan.key,
            amount: opts.amount,
            currency: opts.currency,
            status: PaymentStatus.PAID,
            provider: opts.method,
            providerPaymentId: `${opts.method}_${Date.now()}`,
        },
    });

    const audit = auditAs(opts.actor, opts.request);
    await audit({
        action: 'member.register',
        entity: 'User',
        entityId: user.id,
        after: {
            name: opts.name, email: opts.email, phone: opts.phone,
            planKey: opts.plan.key, amount: opts.amount, currency: opts.currency, method: opts.method, note: opts.note,
        },
    });
    await audit({
        action: 'payment.manual.create',
        entity: 'Payment',
        entityId: payment.id,
        after: { userId: user.id, amount: opts.amount, currency: opts.currency, planKey: opts.plan.key, method: opts.method, note: opts.note },
    });
    void issueInvoiceForPayment(payment.id).catch(() => {});

    return { userId: user.id, tempPassword };
}
