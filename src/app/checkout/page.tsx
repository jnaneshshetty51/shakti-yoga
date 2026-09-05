"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPlan } from "@/lib/pricing";
import Link from "next/link";

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, isLoading, refreshUser } = useAuth();
    const planType = searchParams.get("plan") || "everyday"; // 'everyday', 'therapy', 'trial'

    const [isProcessing, setIsProcessing] = useState(false);

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
    const paymentsLive = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planType }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Payment failed');
            }

            await refreshUser();
            router.push("/welcome");
        } catch (err) {
            console.error('Payment Error:', err);
            alert(`Subscription failed: ${err instanceof Error ? err.message : 'Please try again.'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">

                {/* Order Summary */}
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 h-fit">
                    <h2 className="font-serif text-2xl text-primary mb-6">Order Summary</h2>
                    <div className="flex justify-between items-baseline mb-4 pb-4 border-b border-gray-100">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">{selectedPlan.name}</h3>
                            <p className="text-sm text-gray-500">Billed {selectedPlan.period === 'month' ? 'monthly' : 'once'}</p>
                        </div>
                        <div className="text-2xl font-bold text-primary">${selectedPlan.amount}</div>
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
                        <span>${selectedPlan.amount}</span>
                    </div>
                </div>

                {/* Payment Form */}
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="font-serif text-2xl text-primary mb-6">Payment Details</h2>

                    <form onSubmit={handlePayment} className="space-y-6">
                        {selectedPlan.amount > 0 && !paymentsLive && (
                            <div className="p-4 border border-amber-200 bg-amber-50 rounded text-sm text-amber-800">
                                Online card payments aren&apos;t available yet. Complete this step to
                                register your interest and we&apos;ll reach out to activate your membership,
                                or <Link href="/contact" className="underline font-bold">contact us</Link> directly.
                            </div>
                        )}
                        {selectedPlan.amount > 0 && paymentsLive && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Name on Card</label>
                                    <input type="text" required className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary text-sm sm:text-base" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Zip Code</label>
                                    <input type="text" required className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary text-sm sm:text-base" placeholder="12345" />
                                </div>
                            </div>
                        )}

                        <div className="flex items-start gap-3">
                            <input type="checkbox" id="terms" required className="mt-1" />
                            <label htmlFor="terms" className="text-xs text-gray-600">
                                I agree to the <Link href="#" className="underline">Terms of Service</Link> and <Link href="#" className="underline">Privacy Policy</Link>.
                                {selectedPlan.amount > 0 && " I authorize Shakti Yoga to charge my card for the amount above."}
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="w-full py-4 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                        >
                            {isProcessing ? (
                                <>Processing...</>
                            ) : selectedPlan.amount === 0 ? (
                                <>Start Free Trial</>
                            ) : paymentsLive ? (
                                <>Pay ${selectedPlan.amount}</>
                            ) : (
                                <>Request Membership</>
                            )}
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
