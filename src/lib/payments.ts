/**
 * Payment provider integration point.
 *
 * No real provider (Stripe / Razorpay / …) is wired up yet. Until one is,
 * paid checkouts are refused in production and only the local mock path
 * (NODE_ENV !== 'production', or ALLOW_MOCK_CHECKOUT=true) can grant a paid plan.
 *
 * To enable real payments:
 *   1. Implement `verifyPayment` against the provider's API / webhook.
 *   2. Set PAYMENT_PROVIDER and PAYMENT_API_KEY in the environment.
 */

export function isPaymentsConfigured(): boolean {
    return Boolean(process.env.PAYMENT_PROVIDER && process.env.PAYMENT_API_KEY);
}

/** Whether a checkout may proceed without a verified payment (dev / explicit opt-in). */
export function isMockCheckoutAllowed(): boolean {
    return process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_CHECKOUT === 'true';
}

export interface PaymentConfirmation {
    provider: string;
    reference: string;
    amount: number;
    currency: string;
}

/**
 * Confirm that a real payment was completed for a checkout.
 * Throws until a payment provider is integrated.
 */
export async function verifyPayment(_input: {
    reference?: string;
    amount: number;
    currency: string;
}): Promise<PaymentConfirmation> {
    throw new Error('No payment provider configured');
}
