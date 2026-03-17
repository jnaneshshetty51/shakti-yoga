"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { login, user, isLoading } = useAuth();
    const planType = searchParams.get("plan"); // 'everyday', 'therapy', 'trial'

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

    const planDetails = {
        everyday: {
            name: "Everyday Yoga",
            price: 59,
            period: "month",
            features: ["5 Live Classes/week", "Community Access", "Flexible Timings"]
        },
        therapy: {
            name: "Yoga Therapy",
            price: 120,
            period: "month",
            features: ["4 Personal Sessions", "Health Assessment", "Custom Plan"]
        },
        trial: {
            name: "Free Trial",
            price: 0,
            period: "7 days",
            features: ["1 Live Class", "15-min Consult", "Community Access"]
        }
    };

    const selectedPlan = planDetails[planType as keyof typeof planDetails] || planDetails.everyday;

    const handlePayment = (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        // Simulate payment processing
        setTimeout(() => {
            // Update mock auth state based on plan
            // TODO: Implement actual subscription update via API
            /*
            if (planType === 'therapy') {
                login('member_therapy');
            } else if (planType === 'trial') {
                login('trial');
            } else {
                login('member_everyday');
            }
            */
            console.log('Payment successful for plan:', planType);

            router.push("/welcome");
        }, 2000);
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
                        <div className="text-2xl font-bold text-primary">${selectedPlan.price}</div>
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
                        <span>${selectedPlan.price}</span>
                    </div>
                </div>

                {/* Payment Form */}
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="font-serif text-2xl text-primary mb-6">Payment Details</h2>

                    <form onSubmit={handlePayment} className="space-y-6">
                        {selectedPlan.price > 0 && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Card Information</label>
                                    <div className="p-3 border border-gray-200 rounded bg-gray-50 text-gray-400 text-sm">
                                        Mock Payment - No Card Needed
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Name on Card</label>
                                        <input type="text" required className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary" placeholder="John Doe" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Zip Code</label>
                                        <input type="text" required className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary" placeholder="12345" />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="flex items-start gap-3">
                            <input type="checkbox" id="terms" required className="mt-1" />
                            <label htmlFor="terms" className="text-xs text-gray-600">
                                I agree to the <Link href="#" className="underline">Terms of Service</Link> and <Link href="#" className="underline">Privacy Policy</Link>.
                                {selectedPlan.price > 0 && " I authorize Shakti Yoga to charge my card for the amount above."}
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="w-full py-4 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                        >
                            {isProcessing ? (
                                <>Processing...</>
                            ) : (
                                <>{selectedPlan.price === 0 ? "Start Free Trial" : `Pay $${selectedPlan.price}`}</>
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
