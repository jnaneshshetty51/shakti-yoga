"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
    const router = useRouter();

    const handleSignup = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, we would validate and submit data here
        router.push("/onboarding");
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-accent/30 py-20 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-xl border-t-4 border-secondary">
                <div className="text-center mb-8">
                    <Link href="/" className="font-serif text-3xl font-bold text-primary tracking-wider">
                        Shakti Yoga
                    </Link>
                    <h2 className="mt-4 text-xl font-sans text-text/80">Create Account</h2>
                </div>

                <form onSubmit={handleSignup} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">First Name</label>
                            <input type="text" id="firstName" required className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors" placeholder="John" />
                        </div>
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Last Name</label>
                            <input type="text" id="lastName" required className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors" placeholder="Doe" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Email</label>
                        <input type="email" id="email" required className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors" placeholder="your@email.com" />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Password</label>
                        <input type="password" id="password" required className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors" placeholder="••••••••" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="country" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Country</label>
                            <select id="country" className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors bg-white">
                                <option>India</option>
                                <option>USA</option>
                                <option>UK</option>
                                <option>UAE</option>
                                <option>Australia</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="timezone" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Timezone</label>
                            <select id="timezone" className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors bg-white">
                                <option>IST (GMT+5:30)</option>
                                <option>PST (GMT-8:00)</option>
                                <option>EST (GMT-5:00)</option>
                                <option>GMT (GMT+0:00)</option>
                                <option>AEDT (GMT+11:00)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">WhatsApp / Phone <span className="text-xs font-normal normal-case opacity-50">(Optional)</span></label>
                        <input type="tel" id="phone" className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors" placeholder="+91 98765 43210" />
                    </div>

                    <button type="submit" className="w-full py-3 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors">
                        Sign Up
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-text/60">
                    Already have an account? <Link href="/login" className="text-primary font-bold hover:text-secondary">Log in</Link>
                </div>
            </div>
        </main>
    );
}
