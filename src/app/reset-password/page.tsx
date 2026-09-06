"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Could not reset password");
            }
            setMessage(data.message);
            setTimeout(() => router.push("/login"), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not reset password");
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
                This reset link is missing its token. Please request a new one from the{" "}
                <Link href="/forgot-password" className="font-bold underline">forgot password</Link> page.
            </div>
        );
    }

    return (
        <>
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
                    {error}
                </div>
            )}

            {message ? (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
                    {message} Redirecting to login...
                </div>
            ) : (
                <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="password" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">New Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors text-sm sm:text-base"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors text-sm sm:text-base"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-primary text-white font-bold uppercase tracking-widest text-sm rounded hover:bg-secondary transition-colors disabled:opacity-70 shadow-md"
                    >
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>
                </form>
            )}
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-accent/30 py-12 sm:py-20 px-4">
            <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-lg shadow-xl border-t-4 border-primary">
                <div className="text-center mb-8">
                    <Link href="/" className="font-serif text-3xl font-bold text-primary tracking-wider">
                        Shakti Yoga
                    </Link>
                    <h2 className="mt-4 text-xl font-sans text-text/80">Choose a new password</h2>
                </div>

                <Suspense fallback={<div className="text-center text-sm text-text/60">Loading...</div>}>
                    <ResetPasswordForm />
                </Suspense>

                <div className="mt-8 text-center text-sm text-text/60">
                    <Link href="/login" className="text-primary font-bold hover:text-secondary">Back to log in</Link>
                </div>
            </div>
        </main>
    );
}
