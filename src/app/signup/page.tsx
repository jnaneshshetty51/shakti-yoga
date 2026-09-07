"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const TIMEZONES = [
    { value: "IST", label: "IST (GMT+5:30)" },
    { value: "PST", label: "PST (GMT-8:00)" },
    { value: "EST", label: "EST (GMT-5:00)" },
    { value: "GMT", label: "GMT (GMT+0:00)" },
    { value: "AEDT", label: "AEDT (GMT+11:00)" },
];

export default function SignupPage() {
    const { register } = useAuth();
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        country: "India",
        timezone: "IST",
        phone: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const set = (key: keyof typeof form) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (form.password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);
        try {
            await register({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                password: form.password,
                country: form.country,
                timezone: form.timezone,
                phone: form.phone.trim() || undefined,
            });
            // register() redirects to /onboarding on success
        } catch (err) {
            setError(err instanceof Error ? err.message : "Sign up failed");
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
                    <h2 className="mt-3 text-lg text-gray-500">Create Account</h2>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="firstName" className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">First Name</label>
                            <input type="text" id="firstName" required value={form.firstName} onChange={set("firstName")} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition" placeholder="John" />
                        </div>
                        <div>
                            <label htmlFor="lastName" className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Last Name</label>
                            <input type="text" id="lastName" required value={form.lastName} onChange={set("lastName")} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition" placeholder="Doe" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Email</label>
                        <input type="email" id="email" required value={form.email} onChange={set("email")} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition" placeholder="your@email.com" />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Password</label>
                        <input type="password" id="password" required minLength={8} value={form.password} onChange={set("password")} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition" placeholder="At least 8 characters" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="country" className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Country</label>
                            <select id="country" value={form.country} onChange={set("country")} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition">
                                {["India", "USA", "UK", "UAE", "Australia", "Other"].map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="timezone" className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Timezone</label>
                            <select id="timezone" value={form.timezone} onChange={set("timezone")} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition">
                                {TIMEZONES.map((tz) => (
                                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">WhatsApp / Phone <span className="text-xs font-normal normal-case opacity-50">(Optional)</span></label>
                        <input type="tel" id="phone" value={form.phone} onChange={set("phone")} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition" placeholder="+91 98765 43210" />
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-white font-semibold text-sm rounded-full hover:bg-primary/90 transition-colors disabled:opacity-70">
                        {loading ? "Creating account..." : "Sign Up"}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500">
                    Already have an account? <Link href="/login" className="text-primary font-semibold hover:text-secondary">Log in</Link>
                </div>
            </div>
        </main>
    );
}
