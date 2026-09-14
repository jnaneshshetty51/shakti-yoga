"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyCertificateLandingPage() {
    const router = useRouter();
    const [code, setCode] = useState("");

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = code.trim();
        if (!trimmed) return;
        router.push(`/certificates/verify/${encodeURIComponent(trimmed)}`);
    };

    return (
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
            <h1 className="font-serif text-2xl text-gray-800 mb-3">Certificate Verification</h1>
            <p className="text-gray-500 text-sm mb-8">
                Enter the code printed on a Shakti Yoga certificate to confirm it&rsquo;s genuine.
            </p>

            <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 justify-center">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Certificate code"
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={!code.trim()}
                    className="px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    Verify
                </button>
            </form>
        </div>
    );
}
