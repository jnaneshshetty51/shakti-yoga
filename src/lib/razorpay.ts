import { createHmac } from 'node:crypto';

/**
 * Razorpay integration (Orders API + payment signature verification).
 * Uses the REST API directly — no SDK dependency.
 *
 * Required env:
 *   RAZORPAY_KEY_ID           - key id (also exposed to the browser)
 *   RAZORPAY_KEY_SECRET       - key secret (server only)
 * Optional:
 *   NEXT_PUBLIC_RAZORPAY_KEY_ID - browser copy of the key id for checkout.js
 */

const API_BASE = 'https://api.razorpay.com/v1';

export function getPublicKeyId(): string | null {
    return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || null;
}

export function isRazorpayConfigured(): boolean {
    return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader(): string {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
        throw new Error('Razorpay credentials are not configured');
    }
    return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
}

export interface RazorpayOrder {
    id: string;
    amount: number; // in the smallest currency unit (paise)
    currency: string;
    status: string;
    receipt?: string;
}

/**
 * Create a Razorpay order.
 * @param amountMajor amount in whole currency units (e.g. rupees) — converted to paise here.
 */
export async function createOrder(params: {
    amountMajor: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
    const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader(),
        },
        body: JSON.stringify({
            amount: Math.round(params.amountMajor * 100),
            currency: params.currency,
            receipt: params.receipt,
            notes: params.notes,
        }),
    });

    if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Razorpay order creation failed (${res.status}): ${detail}`);
    }

    return res.json();
}

/**
 * Verify the signature Razorpay Checkout returns after a successful payment.
 * signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret)
 */
export function verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
}): boolean {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
        throw new Error('Razorpay credentials are not configured');
    }
    const expected = createHmac('sha256', keySecret)
        .update(`${params.orderId}|${params.paymentId}`)
        .digest('hex');

    // constant-time-ish compare
    if (expected.length !== params.signature.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
        mismatch |= expected.charCodeAt(i) ^ params.signature.charCodeAt(i);
    }
    return mismatch === 0;
}

/** Fetch a payment's current status from Razorpay (used to double-check). */
export async function fetchPayment(paymentId: string): Promise<{ status: string; amount: number; currency: string }> {
    const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
        headers: { Authorization: authHeader() },
    });
    if (!res.ok) {
        throw new Error(`Razorpay payment fetch failed (${res.status})`);
    }
    return res.json();
}

// ---------------------------------------------------------------------------
// Subscriptions (recurring billing)
// ---------------------------------------------------------------------------

async function rzp<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader(),
            ...(init?.headers ?? {}),
        },
    });
    if (!res.ok) {
        throw new Error(`Razorpay ${path} failed (${res.status}): ${await res.text()}`);
    }
    return res.json();
}

export interface RazorpayPlan {
    id: string;
    period: string;
    interval: number;
    item: { amount: number; currency: string; name: string };
}

/** Create a monthly Razorpay plan for a given amount. */
export function createMonthlyPlan(params: { amountMajor: number; currency: string; name: string }): Promise<RazorpayPlan> {
    return rzp<RazorpayPlan>('/plans', {
        method: 'POST',
        body: JSON.stringify({
            period: 'monthly',
            interval: 1,
            item: {
                name: params.name,
                amount: Math.round(params.amountMajor * 100),
                currency: params.currency,
            },
        }),
    });
}

export interface RazorpaySubscription {
    id: string;
    plan_id: string;
    status: string;
    current_start: number | null;
    current_end: number | null;
    short_url: string;
}

/** Create a subscription against a plan. total_count months before it ends. */
export function createSubscription(params: {
    planId: string;
    totalCount?: number;
    notes?: Record<string, string>;
}): Promise<RazorpaySubscription> {
    return rzp<RazorpaySubscription>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
            plan_id: params.planId,
            total_count: params.totalCount ?? 120,
            customer_notify: 1,
            notes: params.notes,
        }),
    });
}

export function fetchSubscription(id: string): Promise<RazorpaySubscription> {
    return rzp<RazorpaySubscription>(`/subscriptions/${id}`);
}

export function cancelSubscription(id: string, atCycleEnd = true): Promise<RazorpaySubscription> {
    return rzp<RazorpaySubscription>(`/subscriptions/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancel_at_cycle_end: atCycleEnd ? 1 : 0 }),
    });
}

/**
 * Verify the signature Razorpay Checkout returns for a subscription payment.
 * signature = HMAC_SHA256(payment_id + "|" + subscription_id, key_secret)
 */
export function verifySubscriptionSignature(params: {
    paymentId: string;
    subscriptionId: string;
    signature: string;
}): boolean {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error('Razorpay credentials are not configured');
    const expected = createHmac('sha256', keySecret)
        .update(`${params.paymentId}|${params.subscriptionId}`)
        .digest('hex');
    return timingSafeEqualHex(expected, params.signature);
}

/**
 * Verify a Razorpay webhook payload signature (X-Razorpay-Signature header).
 * Uses RAZORPAY_WEBHOOK_SECRET.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return timingSafeEqualHex(expected, signature);
}

function timingSafeEqualHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return mismatch === 0;
}
