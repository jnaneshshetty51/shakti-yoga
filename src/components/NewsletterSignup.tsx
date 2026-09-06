"use client";

import { useState } from "react";

export default function NewsletterSignup() {
    const [email, setEmail] = useState("");
    const [done, setDone] = useState(false);

    if (done) {
        return (
            <p className="text-sm text-secondary" role="status">
                Thanks — we&apos;ll be in touch.
            </p>
        );
    }

    return (
        <form
            className="flex flex-col sm:flex-row gap-2"
            onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setDone(true);
            }}
        >
            <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="bg-white/10 border border-white/20 rounded px-4 py-2.5 text-sm w-full focus:outline-none focus:border-secondary placeholder:text-white/40"
            />
            <button
                type="submit"
                className="px-5 py-2.5 bg-secondary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-white hover:text-primary transition-colors whitespace-nowrap"
            >
                Join
            </button>
        </form>
    );
}
