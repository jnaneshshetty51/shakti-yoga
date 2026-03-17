"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { generateGroupSlots } from "@/utils/slots";
import Link from "next/link";

function TrialBookingContent() {
    const { user, login, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isConsult = searchParams.get("type") === "consult";
    const slots = generateGroupSlots();

    const [step, setStep] = useState(1);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [healthInfo, setHealthInfo] = useState({
        goals: [] as string[],
        hasIssues: false,
        issueDetails: ""
    });

    useEffect(() => {
        if (!isLoading && !user) {
            // If not logged in, we could redirect to login, 
            // but for better UX let's show a prompt or inline login (simplified here)
            // router.push("/login?redirect=/trial");
        }
    }, [user, isLoading, router]);

    const handleGoalToggle = (goal: string) => {
        setHealthInfo(prev => ({
            ...prev,
            goals: prev.goals.includes(goal)
                ? prev.goals.filter(g => g !== goal)
                : [...prev.goals, goal]
        }));
    };

    const handleConfirm = () => {
        // Update user role to trial
        // login('trial');
        // TODO: Implement actual trial activation via API
        router.push("/trial/confirmation");
    };

    if (isLoading) return <div className="p-20 text-center">Loading...</div>;

    if (!user) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-accent/30 py-20 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-xl text-center">
                    <h1 className="font-serif text-3xl text-primary mb-4">
                        {isConsult ? "Book Free Consultation" : "Book Your Free Trial"}
                    </h1>
                    <p className="text-text/70 mb-8">Please create an account or log in to schedule your {isConsult ? "consultation" : "first class"}.</p>
                    <div className="space-y-4">
                        <Link href={`/signup?redirect=/trial${isConsult ? '?type=consult' : ''}`} className="block w-full py-3 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors">
                            Create Account
                        </Link>
                        <Link href={`/login?redirect=/trial${isConsult ? '?type=consult' : ''}`} className="block w-full py-3 border border-primary text-primary font-bold uppercase tracking-widest rounded hover:bg-primary/5 transition-colors">
                            Log In
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="font-serif text-3xl text-primary mb-2 text-center">
                    {isConsult ? "Schedule Your Consultation" : "Book Your Free Trial"}
                </h1>
                <p className="text-center text-text/60 mb-12">One step away from starting your journey.</p>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {/* Progress Bar */}
                    <div className="flex border-b border-gray-100">
                        <div className={`flex-1 p-4 text-center text-sm font-bold uppercase tracking-widest ${step === 1 ? 'bg-primary text-white' : 'text-gray-400'}`}>
                            1. Select Slot
                        </div>
                        <div className={`flex-1 p-4 text-center text-sm font-bold uppercase tracking-widest ${step === 2 ? 'bg-primary text-white' : 'text-gray-400'}`}>
                            2. Personalize
                        </div>
                    </div>

                    <div className="p-8">
                        {step === 1 && (
                            <div className="animate-in fade-in slide-in-from-right-4">
                                <h2 className="font-serif text-2xl text-gray-800 mb-6">Choose a time that works for you</h2>

                                <div className="mb-8">
                                    <h3 className="font-bold text-xs text-gray-500 uppercase tracking-widest mb-4">Morning Batches (IST)</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {slots.morning.slice(0, 6).map((slot) => (
                                            <button
                                                key={slot}
                                                onClick={() => setSelectedSlot(slot)}
                                                className={`p-3 rounded border text-sm transition-all ${selectedSlot === slot
                                                    ? 'bg-primary text-white border-primary font-bold shadow-md'
                                                    : 'border-gray-200 hover:border-primary/50 text-gray-600'
                                                    }`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="font-bold text-xs text-gray-500 uppercase tracking-widest mb-4">Evening Batches (IST)</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {slots.evening.slice(0, 6).map((slot) => (
                                            <button
                                                key={slot}
                                                onClick={() => setSelectedSlot(slot)}
                                                className={`p-3 rounded border text-sm transition-all ${selectedSlot === slot
                                                    ? 'bg-primary text-white border-primary font-bold shadow-md'
                                                    : 'border-gray-200 hover:border-primary/50 text-gray-600'
                                                    }`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setStep(2)}
                                        disabled={!selectedSlot}
                                        className="px-8 py-3 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next Step
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="animate-in fade-in slide-in-from-right-4">
                                <h2 className="font-serif text-2xl text-gray-800 mb-6">Tell us a bit about yourself</h2>

                                <div className="mb-8">
                                    <label className="block text-sm font-bold text-gray-600 mb-3 uppercase tracking-widest">Top Goals</label>
                                    <div className="flex flex-wrap gap-3">
                                        {["Stress Relief", "Flexibility", "Strength", "Weight Loss", "Peace"].map((goal) => (
                                            <button
                                                key={goal}
                                                onClick={() => handleGoalToggle(goal)}
                                                className={`px-4 py-2 rounded-full border text-sm transition-all ${healthInfo.goals.includes(goal)
                                                    ? 'bg-secondary text-white border-secondary font-bold'
                                                    : 'border-gray-200 text-gray-600 hover:border-secondary/50'
                                                    }`}
                                            >
                                                {goal}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <label className="block text-sm font-bold text-gray-600 mb-3 uppercase tracking-widest">Any medical issues?</label>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setHealthInfo(prev => ({ ...prev, hasIssues: false }))}
                                            className={`flex-1 p-3 rounded border text-center text-sm transition-all ${!healthInfo.hasIssues
                                                ? 'bg-primary/10 border-primary text-primary font-bold'
                                                : 'border-gray-200 text-gray-600'
                                                }`}
                                        >
                                            No, I'm fit
                                        </button>
                                        <button
                                            onClick={() => setHealthInfo(prev => ({ ...prev, hasIssues: true }))}
                                            className={`flex-1 p-3 rounded border text-center text-sm transition-all ${healthInfo.hasIssues
                                                ? 'bg-primary/10 border-primary text-primary font-bold'
                                                : 'border-gray-200 text-gray-600'
                                                }`}
                                        >
                                            Yes
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-between pt-6 border-t border-gray-100">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="text-gray-400 hover:text-gray-600 font-bold uppercase tracking-widest text-sm"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        className="px-8 py-3 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors shadow-lg"
                                    >
                                        Confirm Booking
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function TrialBookingPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center">Loading...</div>}>
            <TrialBookingContent />
        </Suspense>
    );
}
