"use client";

import { useState } from "react";

export default function NewsletterSignup() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
    const [error, setError] = useState("");

    if (status === "done") {
        return (
            <p className="text-sm text-secondary" role="status">
                Thanks — we&apos;ll be in touch.
            </p>
        );
    }

    return (
        <form
            className="flex flex-col sm:flex-row gap-2"
            onSubmit={async (e) => {
                e.preventDefault();
                if (!email.trim() || status === "submitting") return;
                setStatus("submitting");
                setError("");
                try {
                    const res = await fetch("/api/newsletter", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: email.trim() }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || "Could not sign you up.");
                    setStatus("done");
                } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not sign you up. Please try again.");
                    setStatus("error");
                }
            }}
        >
            <div className="w-full">
                <div className="flex gap-2">
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Your email address"
                        aria-invalid={status === "error"}
                        className="bg-white/10 border border-white/20 rounded px-4 py-2.5 text-sm w-full focus:outline-none focus:border-secondary placeholder:text-white/40"
                    />
                    <button
                        type="submit"
                        disabled={status === "submitting"}
                        className="px-5 py-2.5 bg-secondary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-white hover:text-primary transition-colors whitespace-nowrap disabled:opacity-60"
                    >
                        {status === "submitting" ? "Joining…" : "Join"}
                    </button>
                </div>
                {error && (
                    <p className="text-xs text-red-300 mt-1.5" role="alert">{error}</p>
                )}
            </div>
        </form>
    );
}
