"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const GOALS = ["Stress Relief", "Flexibility", "Strength", "Weight Loss", "Mental Peace", "Therapy / Healing"];

function TrialContent() {
    const { user, isLoading, refreshUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isConsult = searchParams.get("type") === "consult";

    const [goals, setGoals] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const toggleGoal = (g: string) =>
        setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

    const startTrial = async () => {
        setError("");
        setSubmitting(true);
        try {
            const res = await fetch("/api/checkout/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planType: "trial" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not start your trial.");

            if (goals.length) {
                await fetch("/api/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ goals: goals.join(", ") }),
                }).catch(() => { });
            }

            await refreshUser();
            router.push("/trial/confirmation");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
            setSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="p-20 text-center text-text/60">Loading…</div>;
    }

    // Consultations are a therapy-prospect conversation, not a trial — route to contact.
    if (isConsult) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-accent/30 py-20 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-xl text-center border-t-4 border-secondary">
                    <h1 className="font-serif text-3xl text-primary mb-4">Book a Free Consultation</h1>
                    <p className="text-text/70 mb-8">
                        A 15-minute call to see whether 1:1 Yoga Therapy is right for you. Tell us a little and we&apos;ll be in touch.
                    </p>
                    <Link href="/contact?type=therapy" className="block w-full py-3.5 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors">
                        Continue
                    </Link>
                </div>
            </main>
        );
    }

    if (!user) {
        const back = "/trial";
        return (
            <main className="min-h-screen flex items-center justify-center bg-accent/30 py-20 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-xl text-center border-t-4 border-secondary">
                    <h1 className="font-serif text-3xl text-primary mb-4">Start Your Free Trial</h1>
                    <p className="text-text/70 mb-8">Create an account or log in to activate your 7-day free trial.</p>
                    <div className="space-y-4">
                        <Link href={`/signup?from=${encodeURIComponent(back)}`} className="block w-full py-3.5 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors">
                            Create Account
                        </Link>
                        <Link href={`/login?from=${encodeURIComponent(back)}`} className="block w-full py-3.5 border border-primary text-primary font-bold uppercase tracking-widest rounded hover:bg-primary/5 transition-colors">
                            Log In
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const alreadyMember = user.role === "member_everyday" || user.role === "member_therapy" || user.role === "trial";

    return (
        <main className="min-h-screen bg-gray-50 py-12 sm:py-16 px-4">
            <div className="max-w-lg mx-auto">
                <h1 className="font-serif text-3xl text-primary mb-2 text-center">Your 7-Day Free Trial</h1>
                <p className="text-center text-text/60 mb-10">Full access to every Everyday Yoga class. No card required.</p>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
                    {alreadyMember ? (
                        <div className="text-center">
                            <p className="text-text/80 mb-6">
                                You already have {user.role === "trial" ? "an active trial" : "an active membership"}. Head to your dashboard for today&apos;s class.
                            </p>
                            <Link href="/dashboard" className="inline-block px-8 py-3.5 bg-primary text-white font-bold uppercase tracking-widest text-sm rounded hover:bg-secondary transition-colors">
                                Go to Dashboard
                            </Link>
                        </div>
                    ) : (
                        <>
                            <label className="block text-sm font-bold text-gray-600 mb-3 uppercase tracking-widest">
                                What are you hoping for? <span className="font-normal normal-case opacity-60">(optional)</span>
                            </label>
                            <div className="flex flex-wrap gap-2.5 mb-8">
                                {GOALS.map((g) => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => toggleGoal(g)}
                                        className={`px-4 py-2 rounded-full border text-sm transition-all ${goals.includes(g)
                                            ? "bg-secondary text-white border-secondary font-bold"
                                            : "border-gray-200 text-gray-600 hover:border-secondary/50"}`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm">{error}</div>
                            )}

                            <button
                                onClick={startTrial}
                                disabled={submitting}
                                className="w-full py-4 bg-secondary text-white font-bold uppercase tracking-widest text-sm rounded hover:bg-primary transition-colors shadow-md disabled:opacity-70"
                            >
                                {submitting ? "Activating…" : "Start Free Trial"}
                            </button>
                            <p className="text-xs text-center text-gray-400 mt-4">
                                Your trial runs for 7 days. We&apos;ll remind you before it ends — no automatic charge.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}

export default function TrialPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center text-text/60">Loading…</div>}>
            <TrialContent />
        </Suspense>
    );
}
