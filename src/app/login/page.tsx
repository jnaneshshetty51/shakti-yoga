"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const showDevLogin = process.env.NODE_ENV !== "production";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLogin = async (role: 'admin' | 'member_everyday' | 'member_therapy' | 'trial') => {
        let quickEmail = "";
        // Matches SEED_PASSWORD used by prisma/seed.ts (dev only).
        const quickPassword = process.env.NEXT_PUBLIC_SEED_PASSWORD || "Password123!";

        switch (role) {
            case 'admin':
                quickEmail = 'superadmin@shaktiyoga.com';
                break;
            case 'member_everyday':
                quickEmail = 'member.everyday@shaktiyoga.com';
                break;
            case 'member_therapy':
                quickEmail = 'member.therapy@shaktiyoga.com';
                break;
            case 'trial':
                quickEmail = 'trial@shaktiyoga.com';
                break;
        }

        setEmail(quickEmail);
        setPassword(quickPassword);

        // Auto submit
        setError("");
        setLoading(true);
        try {
            await login(quickEmail, quickPassword);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
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
                    <h2 className="mt-4 text-xl font-sans text-text/80">Welcome Back</h2>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
                        {error}
                    </div>
                )}

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
                    <div>
                        <label htmlFor="password" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Password</label>
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

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                        <label className="flex items-center cursor-pointer">
                            <input type="checkbox" className="mr-2 text-primary focus:ring-primary h-4 w-4" />
                            <span className="text-text/70">Remember me</span>
                        </label>
                        <a href="#" className="text-primary hover:text-secondary transition-colors text-xs sm:text-sm">Forgot password?</a>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-primary text-white font-bold uppercase tracking-widest text-sm rounded hover:bg-secondary transition-colors disabled:opacity-70 shadow-md"
                    >
                        {loading ? 'Logging in...' : 'Log In'}
                    </button>
                </form>

                {showDevLogin && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-xs text-center text-gray-400 uppercase tracking-widest mb-4">Dev: Quick Login</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <button onClick={() => handleQuickLogin('admin')} className="p-2.5 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-bold min-h-[40px]">
                                Admin
                            </button>
                            <button onClick={() => handleQuickLogin('member_everyday')} className="p-2.5 text-xs bg-green-50 hover:bg-green-100 rounded text-green-700 font-bold min-h-[40px]">
                                Member (Everyday)
                            </button>
                            <button onClick={() => handleQuickLogin('member_therapy')} className="p-2.5 text-xs bg-purple-50 hover:bg-purple-100 rounded text-purple-700 font-bold min-h-[40px]">
                                Member (Therapy)
                            </button>
                            <button onClick={() => handleQuickLogin('trial')} className="p-2.5 text-xs bg-orange-50 hover:bg-orange-100 rounded text-orange-700 font-bold min-h-[40px]">
                                Trial User
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-8 text-center text-sm text-text/60">
                    Don&apos;t have an account? <Link href="/signup" className="text-primary font-bold hover:text-secondary">Sign up</Link>
                </div>
            </div>
        </main>
    );
}
