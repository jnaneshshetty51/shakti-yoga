import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, signToken, mapDatabaseRole } from '@/lib/auth';
import { cookies } from 'next/headers';
import { getPlan } from '@/lib/pricing';
import { isPaymentsConfigured, isMockCheckoutAllowed, verifyPayment } from '@/lib/payments';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid or expired session token' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const { planType, paymentReference } = body; // planType: 'everyday' | 'therapy' | 'trial'

        const plan = getPlan(planType);

        // Payment gate: a paid plan requires a verified payment. Until a provider
        // is wired up, only the local mock path may grant a paid plan.
        if (plan.amount > 0) {
            if (isPaymentsConfigured()) {
                try {
                    await verifyPayment({
                        reference: paymentReference,
                        amount: plan.amount,
                        currency: plan.currency,
                    });
                } catch {
                    return NextResponse.json(
                        { error: 'Payment could not be verified. You have not been charged.' },
                        { status: 402 },
                    );
                }
            } else if (!isMockCheckoutAllowed()) {
                return NextResponse.json(
                    {
                        error:
                            'Online payments are not available yet. Please contact us to activate your membership.',
                    },
                    { status: 501 },
                );
            }
        }

        // Update user role
        const updatedUser = await prisma.user.update({
            where: { id: payload.id },
            data: { role: plan.role },
        });

        // Calculate 30-day renewal date
        const renewalDate = new Date();
        renewalDate.setDate(renewalDate.getDate() + 30);

        // Upsert subscription record
        await prisma.subscription.upsert({
            where: { userId: payload.id },
            create: {
                userId: payload.id,
                planType: plan.dbPlanType,
                amount: plan.amount,
                currency: plan.currency,
                status: plan.subscriptionStatus,
                renewalDate,
            },
            update: {
                planType: plan.dbPlanType,
                amount: plan.amount,
                currency: plan.currency,
                status: plan.subscriptionStatus,
                renewalDate,
            },
        });

        const mappedRole = mapDatabaseRole(updatedUser.role);

        // Re-issue updated JWT token
        const newToken = await signToken({
            id: updatedUser.id,
            email: updatedUser.email,
            role: mappedRole,
            name: updatedUser.name,
        });

        cookieStore.set('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        return NextResponse.json({
            success: true,
            message: `Successfully subscribed to ${plan.name}!`,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: mappedRole,
            },
        });
    } catch (error) {
        console.error('Checkout API error:', error);
        return NextResponse.json({ error: 'Internal server error processing subscription' }, { status: 500 });
    }
}
