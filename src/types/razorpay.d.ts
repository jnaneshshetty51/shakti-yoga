interface RazorpaySuccessResponse {
    razorpay_order_id?: string;
    razorpay_subscription_id?: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

interface RazorpayOptions {
    key: string;
    name: string;
    description?: string;
    /** One-time order flow. */
    amount?: number;
    currency?: string;
    order_id?: string;
    /** Recurring subscription flow. */
    subscription_id?: string;
    handler: (response: RazorpaySuccessResponse) => void;
    prefill?: { name?: string; email?: string; contact?: string };
    notes?: Record<string, string>;
    theme?: { color?: string };
    modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
    open: () => void;
    on: (event: string, cb: (response: unknown) => void) => void;
}

interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
}
