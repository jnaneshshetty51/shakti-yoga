"use client";

import { useState } from "react";

const SUBJECTS = ["General Inquiry", "Free Trial Class", "Yoga Therapy Consultation", "Billing Issue"];

export default function ContactForm() {
    const [form, setForm] = useState({ name: "", email: "", subject: SUBJECTS[0], message: "" });
    const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const [error, setError] = useState<string | null>(null);

    const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("sending");
        setError(null);
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Could not send your message.");
            setStatus("sent");
            setForm({ name: "", email: "", subject: SUBJECTS[0], message: "" });
        } catch (err) {
            setStatus("error");
            setError(err instanceof Error ? err.message : "Could not send your message.");
        }
    };

    if (status === "sent") {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-primary text-center">
                <div className="text-4xl mb-3">🙏</div>
                <h2 className="font-serif text-2xl text-text mb-2">Message sent</h2>
                <p className="text-text/70 text-sm">Thank you — we&apos;ll get back to you at {form.email || "your email"} soon.</p>
                <button
                    onClick={() => setStatus("idle")}
                    className="mt-6 text-sm font-bold text-primary uppercase tracking-widest hover:underline"
                >
                    Send another
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-primary">
            <h2 className="font-serif text-2xl text-text mb-6">Send us a Message</h2>
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>
            )}
            <form className="space-y-4" onSubmit={submit}>
                <div>
                    <label htmlFor="name" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Name</label>
                    <input
                        type="text" id="name" required value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        className="w-full p-3 bg-accent/20 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors"
                        placeholder="Your Name"
                    />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Email</label>
                    <input
                        type="email" id="email" required value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        className="w-full p-3 bg-accent/20 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors"
                        placeholder="your@email.com"
                    />
                </div>
                <div>
                    <label htmlFor="subject" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Subject</label>
                    <select
                        id="subject" value={form.subject}
                        onChange={(e) => set("subject", e.target.value)}
                        className="w-full p-3 bg-accent/20 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors"
                    >
                        {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="message" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Message</label>
                    <textarea
                        id="message" rows={4} required value={form.message}
                        onChange={(e) => set("message", e.target.value)}
                        className="w-full p-3 bg-accent/20 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors"
                        placeholder="How can we help you?"
                    />
                </div>
                <button
                    type="submit"
                    disabled={status === "sending"}
                    className="w-full py-4 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors disabled:opacity-70"
                >
                    {status === "sending" ? "Sending..." : "Send Message"}
                </button>
            </form>
        </div>
    );
}
