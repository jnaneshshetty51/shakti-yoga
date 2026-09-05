import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { PLANS } from '@/lib/pricing';
import { verifyPaymentSignature, fetchPayment } from '@/lib/razorpay';
import { activatePlan } from '@/lib/subscription';
import type { PlanType } from '@prisma/client';

function planConfigForDbType(planType: PlanType) {
    return Object.values(PLANS).find(p => p.dbPlanType === planType) ?? PLANS.everyday;
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({ error: 'Missing payment confirmation fields.' }, { status: 400 });
        }

        const paymentRecord = await prisma.payment.findUnique({
            where: { providerOrderId: razorpay_order_id },
        });

        if (!paymentRecord || paymentRecord.userId !== payload.id) {
            return NextResponse.json({ error: 'Unknown order.' }, { status: 404 });
        }

        if (paymentRecord.status === 'PAID') {
            // Idempotent: already processed.
            return NextResponse.json({ success: true, alreadyProcessed: true });
        }

        const signatureValid = verifyPaymentSignature({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
        });

        if (!signatureValid) {
            await prisma.payment.update({
                where: { id: paymentRecord.id },
                data: { status: 'FAILED', providerPaymentId: razorpay_payment_id },
            });
            return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
        }

        // Cross-check with Razorpay that the payment actually captured the right amount.
        const remote = await fetchPayment(razorpay_payment_id);
        const expectedPaise = Math.round(paymentRecord.amount * 100);
        if (
            (remote.status !== 'captured' && remote.status !== 'authorized') ||
            remote.amount !== expectedPaise
        ) {
            await prisma.payment.update({
                where: { id: paymentRecord.id },
                data: { status: 'FAILED', providerPaymentId: razorpay_payment_id },
            });
            return NextResponse.json({ error: 'Payment could not be confirmed.' }, { status: 400 });
        }

        await prisma.payment.update({
            where: { id: paymentRecord.id },
            data: {
                status: 'PAID',
                providerPaymentId: razorpay_payment_id,
                providerSignature: razorpay_signature,
            },
        });

        const plan = planConfigForDbType(paymentRecord.planType);
        const { user, mappedRole } = await activatePlan(payload.id, plan);

        return NextResponse.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email, role: mappedRole },
        });
    } catch (error) {
        console.error('Checkout verify error:', error);
        return NextResponse.json({ error: 'Could not verify payment. If you were charged, contact support.' }, { status: 500 });
    }
}
