"use client";

import { useState } from "react";

const BLANK = {
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    employeeCount: "",
    programInterest: "Desk Ergonomics & Spine Reset",
    requirement: "",
    message: "",
};

export default function CorporateForm() {
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
        <section id="enquiry" className="py-16 sm:py-24 px-4 sm:px-8 max-w-4xl mx-auto scroll-mt-20">
            <div className="text-center mb-10">
                <span className="text-secondary text-xs font-bold uppercase tracking-widest block mb-2">Get In Touch</span>
                <h2 className="font-serif text-3xl sm:text-4xl text-primary">Request a Custom Proposal or Pilot Session</h2>
                <p className="text-text/70 text-sm mt-2">
                    Tell us about your organization and our corporate wellness team will respond within 24 hours.
                </p>
            </div>

            {done ? (
                <div className="bg-white border-2 border-emerald-500/30 p-10 rounded-3xl text-center space-y-4 shadow-md">
                    <span className="text-5xl block">🎉</span>
                    <h3 className="font-serif text-2xl text-primary">Proposal Request Received</h3>
                    <p className="text-text/80 text-sm max-w-md mx-auto">
                        Thank you, {form.contactName}. We have received your inquiry for <strong>{form.companyName}</strong>. Our enterprise lead will contact you shortly with program details and pilot booking slots.
                    </p>
                    <button
                        onClick={() => { setDone(false); setForm({ ...BLANK }); }}
                        className="text-xs font-bold text-secondary uppercase tracking-widest hover:underline pt-2"
                    >
                        Send another request
                    </button>
                </div>
            ) : (
                <form onSubmit={submit} className="bg-white border border-primary/10 rounded-3xl shadow-lg p-6 sm:p-10 space-y-5">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-text/70 mb-1.5">Company Name *</label>
                            <input
                                required
                                placeholder="Acme Technologies, Inc."
                                value={form.companyName}
                                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-text/70 mb-1.5">Your Full Name *</label>
                            <input
                                required
                                placeholder="Jane Doe"
                                value={form.contactName}
                                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-text/70 mb-1.5">Work Email *</label>
                            <input
                                required
                                type="email"
                                placeholder="jane@company.com"
                                value={form.contactEmail}
                                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-text/70 mb-1.5">Phone / WhatsApp (optional)</label>
                            <input
                                placeholder="+1 (555) 019-2834"
                                value={form.contactPhone}
                                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-text/70 mb-1.5">Number of Employees</label>
                            <select
                                value={form.employeeCount}
                                onChange={(e) => setForm({ ...form, employeeCount: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors bg-white"
                            >
                                <option value="">Select team size</option>
                                <option value="15">10 – 25 employees</option>
                                <option value="50">25 – 100 employees</option>
                                <option value="250">100 – 500 employees</option>
                                <option value="1000">500+ enterprise</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-text/70 mb-1.5">Program of Interest</label>
                            <select
                                value={form.programInterest}
                                onChange={(e) => setForm({ ...form, programInterest: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors bg-white"
                            >
                                <option value="Desk Ergonomics & Spine Reset">Desk Ergonomics &amp; Spine Reset (30 min)</option>
                                <option value="Executive Stress Resilience & Breathwork">Executive Stress Resilience &amp; Breathwork</option>
                                <option value="All-Access Distributed Team Subscriptions">All-Access Distributed Team Subscriptions</option>
                                <option value="One-Time Team Wellness Workshop / Offsite">One-Time Team Wellness Workshop / Offsite</option>
                                <option value="Custom Enterprise Package">Custom Enterprise Package</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-text/70 mb-1.5">Tell Us About Your Team &amp; Goals</label>
                        <textarea
                            placeholder="E.g., distributed engineering team experiencing screen fatigue, preferred time zones, target launch month..."
                            value={form.requirement}
                            onChange={(e) => setForm({ ...form, requirement: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <button
                            type="submit"
                            disabled={busy}
                            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-secondary transition-colors disabled:opacity-60 shadow-md"
                        >
                            {busy ? "Submitting Request…" : "Request Custom Proposal →"}
                        </button>
                        <span className="text-xs text-text/60">
                            🔒 Your information is private &amp; never shared.
                        </span>
                    </div>
                </form>
            )}
        </section>
    );
}
