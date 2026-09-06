"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Something went wrong");
            }
            setMessage(data.message);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-accent/30 py-12 sm:py-20 px-4">
            <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-lg shadow-xl border-t-4 border-primary">
                <div className="text-center mb-8">
                    <Link href="/" className="font-serif text-3xl font-bold text-primary tracking-wider">
                        Shakti Yoga
                    </Link>
                    <h2 className="mt-4 text-xl font-sans text-text/80">Reset your password</h2>
                    <p className="mt-2 text-sm text-text/60">Enter your email and we&apos;ll send you a reset link.</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
                        {error}
                    </div>
                )}

                {message ? (
                    <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
                        {message}
                    </div>
                ) : (
                    <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors text-sm sm:text-base"
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-primary text-white font-bold uppercase tracking-widest text-sm rounded hover:bg-secondary transition-colors disabled:opacity-70 shadow-md"
                        >
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>
                    </form>
                )}

                <div className="mt-8 text-center text-sm text-text/60">
                    <Link href="/login" className="text-primary font-bold hover:text-secondary">Back to log in</Link>
                </div>
            </div>
        </main>
    );
}
