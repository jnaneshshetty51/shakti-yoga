import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { verifyPaymentSignature, verifySubscriptionSignature } from '@/lib/razorpay';
import { confirmAndActivate } from '@/lib/checkoutConfirm';

export async function POST(request: Request) {
    try {
        const payload = await getSession();
        if (!payload) {
            return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const asStr = (v: unknown) => (typeof v === 'string' && v.length > 0 && v.length <= 256 ? v : undefined);
        const razorpay_order_id = asStr(body.razorpay_order_id);
        const razorpay_subscription_id = asStr(body.razorpay_subscription_id);
        const razorpay_payment_id = asStr(body.razorpay_payment_id);
        const razorpay_signature = asStr(body.razorpay_signature);

        if (!razorpay_payment_id || !razorpay_signature || (!razorpay_order_id && !razorpay_subscription_id)) {
            return NextResponse.json({ error: 'Missing payment confirmation fields.' }, { status: 400 });
        }

        // --- Recurring subscription payment ---
        if (razorpay_subscription_id) {
            const paymentRecord = await prisma.payment.findFirst({
                where: { providerSubscriptionId: razorpay_subscription_id, userId: payload.id },
                orderBy: { createdAt: 'desc' },
            });
            if (!paymentRecord) {
                return NextResponse.json({ error: 'Unknown subscription.' }, { status: 404 });
            }
            if (paymentRecord.status === 'PAID') {
                return NextResponse.json({ success: true, alreadyProcessed: true });
            }

            const valid = verifySubscriptionSignature({
                paymentId: razorpay_payment_id,
                subscriptionId: razorpay_subscription_id,
                signature: razorpay_signature,
            });
            if (!valid) {
                await prisma.payment.update({
                    where: { id: paymentRecord.id },
                    data: { status: 'FAILED', providerPaymentId: razorpay_payment_id },
                });
                return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
            }

            const result = await confirmAndActivate({
                userId: payload.id,
                paymentRecord,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                recurring: true,
                subscriptionId: razorpay_subscription_id,
            });
            if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
            return NextResponse.json({ success: true, user: result.user });
        }

        // --- One-time order payment ---
        if (!razorpay_order_id) {
            return NextResponse.json({ error: 'Missing order id.' }, { status: 400 });
        }
        const paymentRecord = await prisma.payment.findUnique({ where: { providerOrderId: razorpay_order_id } });
        if (!paymentRecord || paymentRecord.userId !== payload.id) {
            return NextResponse.json({ error: 'Unknown order.' }, { status: 404 });
        }
        if (paymentRecord.status === 'PAID') {
            return NextResponse.json({ success: true, alreadyProcessed: true });
        }

        const valid = verifyPaymentSignature({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
        });
        if (!valid) {
            await prisma.payment.update({
                where: { id: paymentRecord.id },
                data: { status: 'FAILED', providerPaymentId: razorpay_payment_id },
            });
            return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
        }

        const result = await confirmAndActivate({
            userId: payload.id,
            paymentRecord,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            recurring: false,
        });
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
        return NextResponse.json({ success: true, user: result.user });
    } catch (error) {
        console.error('Checkout verify error:', error);
        return NextResponse.json({ error: 'Could not verify payment. If you were charged, contact support.' }, { status: 500 });
    }
}
