"use client";

import { useState } from "react";

const BLANK = {
    companyName: "", contactName: "", contactEmail: "", contactPhone: "",
    employeeCount: "", programInterest: "", requirement: "", message: "",
};

export default function CorporatePage() {
    const [form, setForm] = useState({ ...BLANK });
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const res = await fetch("/api/corporate/enquiry", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not send your enquiry");
            setDone(true);
        } catch (e2) {
            setError(e2 instanceof Error ? e2.message : "Could not send your enquiry");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-16">
            <h1 className="font-serif text-3xl text-gray-800 mb-2">Corporate Wellness</h1>
            <p className="text-gray-500 mb-8">
                Bring authentic yoga and yoga therapy to your team. Tell us about your company and we&rsquo;ll get back to you with a custom package.
            </p>

            {done ? (
                <div className="p-6 bg-green-50 border border-green-200 rounded-2xl text-green-700">
                    Thank you — our team will reach out within 1 business day.
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-4 bg-white border border-gray-100 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-6">
                    {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <input required placeholder="Company name" value={form.companyName}
                            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <input required placeholder="Your name" value={form.contactName}
                            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <input required type="email" placeholder="Work email" value={form.contactEmail}
                            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <input placeholder="Phone (optional)" value={form.contactPhone}
                            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <input type="number" min={0} placeholder="Number of employees" value={form.employeeCount}
                            onChange={(e) => setForm({ ...form, employeeCount: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <input placeholder="Program of interest" value={form.programInterest}
                            onChange={(e) => setForm({ ...form, programInterest: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <textarea placeholder="What are you looking for?" value={form.requirement}
                        onChange={(e) => setForm({ ...form, requirement: e.target.value })} rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <textarea placeholder="Anything else we should know?" value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })} rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <button disabled={busy} className="px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
                        {busy ? "Sending…" : "Send enquiry"}
                    </button>
                </form>
            )}
        </div>
    );
}
