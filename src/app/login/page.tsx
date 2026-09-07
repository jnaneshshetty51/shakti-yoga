"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const showDevLogin = process.env.NODE_ENV !== "production";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password, remember);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
            setLoading(false);
        }
    };

    const handleQuickLogin = async (role: 'admin' | 'member_everyday' | 'member_therapy' | 'trial') => {
        let quickEmail = "";
        // Only matches the seed script's default password when SEED_PASSWORD
        // isn't overridden. Deliberately not read from a NEXT_PUBLIC_* env var -
        // that would ship whatever the real seed password is to every visitor's
        // browser, dev build or not.
        const quickPassword = "Password123!";

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
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-[#FBFAF7] py-12 sm:py-20 px-4">
            <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl shadow-[0_4px_28px_rgba(16,24,40,0.06)] border border-gray-100">
                <div className="text-center mb-8">
                    <Link href="/" className="font-serif text-3xl font-bold text-primary">
                        Shakti<span className="text-secondary">.</span>
                    </Link>
                    <h2 className="mt-3 text-lg text-gray-500">Welcome back</h2>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                            placeholder="your@email.com"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                        <label className="flex items-center cursor-pointer text-gray-600">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                className="mr-2 accent-primary h-4 w-4"
                            />
                            Remember me
                        </label>
                        <Link href="/forgot-password" className="text-primary hover:text-secondary transition-colors text-sm">Forgot password?</Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary text-white font-semibold text-sm rounded-full hover:bg-primary/90 transition-colors disabled:opacity-70"
                    >
                        {loading ? 'Logging in…' : 'Log in'}
                    </button>
                </form>

                {showDevLogin && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-xs text-center text-gray-400 uppercase tracking-widest mb-4">Dev: quick login</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button onClick={() => handleQuickLogin('admin')} className="p-2.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-semibold min-h-[40px]">
                                Admin
                            </button>
                            <button onClick={() => handleQuickLogin('member_everyday')} className="p-2.5 text-xs bg-green-50 hover:bg-green-100 rounded-lg text-green-700 font-semibold min-h-[40px]">
                                Member (Everyday)
                            </button>
                            <button onClick={() => handleQuickLogin('member_therapy')} className="p-2.5 text-xs bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 font-semibold min-h-[40px]">
                                Member (Therapy)
                            </button>
                            <button onClick={() => handleQuickLogin('trial')} className="p-2.5 text-xs bg-orange-50 hover:bg-orange-100 rounded-lg text-orange-700 font-semibold min-h-[40px]">
                                Trial User
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-8 text-center text-sm text-gray-500">
                    Don&apos;t have an account? <Link href="/signup" className="text-primary font-semibold hover:text-secondary">Sign up</Link>
                </div>
            </div>
        </main>
    );
}
