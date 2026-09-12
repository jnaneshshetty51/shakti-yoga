"use client";

import Link from "next/link";

export default function TherapyStartPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-accent/30 py-20 px-4">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h1 className="font-serif text-4xl text-primary mb-4">Begin Your Healing Journey</h1>
                    <p className="text-xl text-text/70">Choose how you'd like to start your personalized yoga therapy.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Option 1: Consultation */}
                    <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-100 hover:border-primary/30 transition-all transform hover:-translate-y-1">
                        <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl mb-6">
                            ?
                        </div>
                        <h2 className="font-serif text-2xl text-gray-800 mb-2">Free Consultation</h2>
                        <p className="text-text/60 mb-6 min-h-[3rem]">
                            Not sure if therapy is right for you? Chat with a senior therapist for 15 mins.
                        </p>
                        <ul className="space-y-3 mb-8 text-sm text-gray-600">
                            <li className="flex items-center gap-2">✓ Discuss your health history</li>
                            <li className="flex items-center gap-2">✓ Understand the process</li>
                            <li className="flex items-center gap-2">✓ No commitment required</li>
                        </ul>
                        <Link
                            href="/contact?type=therapy"
                            className="block w-full py-3 border-2 border-primary text-primary font-bold uppercase tracking-widest text-center rounded hover:bg-primary hover:text-white transition-colors"
                        >
                            Book Free Consult
                        </Link>
                    </div>

                    {/* Option 2: Subscribe */}
                    <div className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-secondary relative overflow-hidden transform hover:-translate-y-1 transition-all">
                        <div className="absolute top-0 right-0 bg-secondary text-white text-xs font-bold px-3 py-1 uppercase tracking-widest rounded-bl">
                            Recommended
                        </div>
                        <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl mb-6">
                            ✨
                        </div>
                        <h2 className="font-serif text-2xl text-gray-800 mb-2">Start Your Assessment</h2>
                        <p className="text-text/60 mb-6 min-h-[3rem]">
                            Ready to heal? Complete a short health assessment so a therapist can recommend the right plan
                            for you before you subscribe.
                        </p>
                        <ul className="space-y-3 mb-8 text-sm text-gray-600">
                            <li className="flex items-center gap-2">✓ 5-minute health assessment</li>
                            <li className="flex items-center gap-2">✓ Reviewed by a Shakti therapist</li>
                            <li className="flex items-center gap-2">✓ Personalized recommendation before you pay</li>
                        </ul>
                        <Link
                            href="/yoga-therapy/intake"
                            className="block w-full py-3 bg-secondary text-white font-bold uppercase tracking-widest text-center rounded hover:bg-primary transition-colors shadow-md"
                        >
                            Begin Yoga Therapy Assessment
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
