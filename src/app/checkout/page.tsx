"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Script from "next/script";
import { useAuth } from "@/context/AuthContext";
import { getPlan, formatPrice } from "@/lib/pricing";
import Link from "next/link";

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, isLoading, refreshUser } = useAuth();
    const planType = searchParams.get("plan") || "everyday";

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scriptReady, setScriptReady] = useState(false);

    if (!isLoading && !user) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-accent/30 py-20 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-xl text-center">
                    <h1 className="font-serif text-3xl text-primary mb-4">Create Account</h1>
                    <p className="text-text/70 mb-8">Please log in or sign up to complete your subscription.</p>
                    <div className="space-y-4">
                        <Link href={`/signup?redirect=/checkout?plan=${planType}`} className="block w-full py-3 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors">
                            Create Account
                        </Link>
                        <Link href={`/login?redirect=/checkout?plan=${planType}`} className="block w-full py-3 border border-primary text-primary font-bold uppercase tracking-widest rounded hover:bg-primary/5 transition-colors">
                            Log In
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const selectedPlan = getPlan(planType);
    const isFree = selectedPlan.amount === 0;

    const finish = async () => {
        await refreshUser();
        router.push("/welcome");
    };

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsProcessing(true);

        try {
            const res = await fetch("/api/checkout/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planType }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Checkout failed");
            }

            if (data.free) {
                await finish();
                return;
            }

            if (!scriptReady || typeof window.Razorpay !== "function") {
                throw new Error("Payment library is still loading. Please try again in a moment.");
            }

            const rzp = new window.Razorpay({
                key: data.keyId,
                name: "Shakti Yoga",
                description: `${data.planName} — monthly membership`,
                subscription_id: data.subscriptionId,
                prefill: data.prefill,
                theme: { color: "#4A6741" },
                modal: {
                    ondismiss: () => {
                        setIsProcessing(false);
                        setError("Payment was cancelled.");
                    },
                },
                handler: async (response) => {
                    try {
                        const verifyRes = await fetch("/api/checkout/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(response),
                        });
                        const verifyData = await verifyRes.json();
                        if (!verifyRes.ok) {
                            throw new Error(verifyData.error || "Payment verification failed");
                        }
                        await finish();
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "Payment verification failed");
                        setIsProcessing(false);
                    }
                },
            });
            rzp.open();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
            setIsProcessing(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 py-12 px-4">
            <Script
                src="https://checkout.razorpay.com/v1/checkout.js"
                onLoad={() => setScriptReady(true)}
                onReady={() => setScriptReady(true)}
            />
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
                {/* Order Summary */}
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 h-fit">
                    <h2 className="font-serif text-2xl text-primary mb-6">Order Summary</h2>
                    <div className="flex justify-between items-baseline mb-4 pb-4 border-b border-gray-100">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">{selectedPlan.name}</h3>
                            <p className="text-sm text-gray-500">
                                {isFree ? "7-day free trial" : `Billed monthly`}
                            </p>
                        </div>
                        <div className="text-2xl font-bold text-primary">
                            {isFree ? "Free" : formatPrice(selectedPlan.amount, selectedPlan.currency)}
                        </div>
                    </div>

                    <ul className="space-y-3 mb-6">
                        {selectedPlan.features.map((feature, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                                <span className="text-green-500">✓</span> {feature}
                            </li>
                        ))}
                    </ul>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 font-bold text-lg">
                        <span>Total</span>
                        <span>{isFree ? "Free" : formatPrice(selectedPlan.amount, selectedPlan.currency)}</span>
                    </div>
                </div>

                {/* Payment */}
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="font-serif text-2xl text-primary mb-6">
                        {isFree ? "Confirm" : "Payment"}
                    </h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleCheckout} className="space-y-6">
                        {!isFree && (
                            <p className="text-sm text-gray-600">
                                You&apos;ll complete your payment securely through Razorpay (UPI, cards,
                                net banking and wallets). Your membership activates as soon as the
                                payment succeeds.
                            </p>
                        )}

                        <div className="flex items-start gap-3">
                            <input type="checkbox" id="terms" required className="mt-1" />
                            <label htmlFor="terms" className="text-xs text-gray-600">
                                I agree to the <Link href="/terms" className="underline">Terms of Service</Link> and{" "}
                                <Link href="/privacy" className="underline">Privacy Policy</Link>.
                                {!isFree && ` I authorise Shakti Yoga to charge ${formatPrice(selectedPlan.amount, selectedPlan.currency)} for this subscription.`}
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="w-full py-4 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                        >
                            {isProcessing
                                ? "Processing..."
                                : isFree
                                    ? "Start Free Trial"
                                    : `Pay ${formatPrice(selectedPlan.amount, selectedPlan.currency)}`}
                        </button>

                        <div className="text-center">
                            <Link href="/programs" className="text-xs text-gray-400 hover:text-gray-600">Cancel and go back</Link>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center">Loading checkout...</div>}>
            <CheckoutContent />
        </Suspense>
    );
}
