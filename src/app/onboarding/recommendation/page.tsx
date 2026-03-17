"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function RecommendationContent() {
    const searchParams = useSearchParams();
    const plan = searchParams.get("plan");
    const isTherapy = plan === "therapy";

    return (
        <main className="min-h-screen flex items-center justify-center bg-background py-20 px-4">
            <div className="max-w-3xl w-full text-center">
                <h1 className="font-serif text-4xl text-primary mb-4">We've found your perfect path</h1>
                <p className="text-xl text-text/70 mb-12 max-w-xl mx-auto">
                    Based on your goals and health profile, we recommend:
                </p>

                <div className="bg-white p-8 rounded-lg shadow-xl border-t-4 border-secondary max-w-md mx-auto mb-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-secondary text-white text-xs font-bold px-3 py-1 uppercase tracking-widest rounded-bl">
                        Recommended
                    </div>

                    <h2 className="font-serif text-3xl text-text mb-2">
                        {isTherapy ? "Yoga Therapy" : "Everyday Yoga"}
                    </h2>
                    <p className="font-sans text-sm text-text/60 uppercase tracking-widest mb-6">
                        {isTherapy ? "1:1 Personalized Healing" : "Daily Group Classes"}
                    </p>

                    <div className="text-5xl font-serif text-primary mb-6">
                        {isTherapy ? "$120" : "$59"}<span className="text-lg text-text/50 font-sans">/month</span>
                    </div>

                    <p className="font-sans text-text/80 mb-8 leading-relaxed">
                        {isTherapy
                            ? "Since you mentioned specific health goals or conditions, a personalized 1:1 approach is best to ensure safety and effective healing."
                            : "This plan is perfect for building a consistent habit, improving flexibility, and finding mental peace through daily practice."
                        }
                    </p>

                    <Link
                        href={isTherapy ? "/contact?type=therapy" : "/dashboard"}
                        className="block w-full py-4 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors shadow-md"
                    >
                        {isTherapy ? "Book Consultation" : "Start Free Trial"}
                    </Link>
                </div>

                <div className="text-sm text-text/60">
                    Prefer the other option? <Link href="/programs" className="text-primary font-bold hover:underline">View all plans</Link>
                </div>
            </div>
        </main>
    );
}

export default function RecommendationPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center">Loading recommendation...</div>}>
            <RecommendationContent />
        </Suspense>
    );
}
