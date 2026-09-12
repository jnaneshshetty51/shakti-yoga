"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";

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

const PROGRAMS = [
    {
        title: "Desk Ergonomics & Spinal Reset",
        badge: "Most Popular",
        desc: "30-minute virtual micro-sessions designed for seated knowledge workers. Relieves neck stiffness, frozen shoulders, and lower back fatigue without changing into gym clothes.",
        bullets: [
            "Chair-based alignment and thoracic expansion",
            "Screen fatigue & eye-strain relaxation techniques",
            "Zero sweat, high-rejuvenation format",
        ],
    },
    {
        title: "Executive Stress Resilience & Breathwork",
        badge: "Leadership & High-Impact",
        desc: "Pranayama mastery and nervous system down-regulation to calm sympathetic stress, improve sleep quality, and sustain executive decision-making clarity.",
        bullets: [
            "Physiological sigh and vagus nerve reset methods",
            "Pre-meeting focus & energy balancing techniques",
            "Guided 15-minute midday nervous system resets",
        ],
    },
    {
        title: "All-Access Distributed Team Subscriptions",
        badge: "Global Teams",
        desc: "Provide your distributed workforce across US, Europe, and Asia with unlimited access to our daily live classes and guided therapy sessions.",
        bullets: [
            "Multiple time-zone slots (IST, EST, PST, GMT)",
            "Dedicated company batch options available",
            "Monthly attendance & engagement reports for HR",
        ],
    },
];

const METRICS = [
    { stat: "84%", label: "Reported reduction in work-related neck and lower back discomfort within 4 weeks" },
    { stat: "2.4x", label: "Increase in reported afternoon focus and energy post-session" },
    { stat: "100%", label: "Live instruction by certified Indian master teachers with personalized camera feedback" },
];

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
        <main className="bg-background min-h-screen">
            <PageHeader
                title="Corporate Wellness & Leadership Vitality"
                subtitle="Traditional yoga science and clinical postural recovery engineered for modern, distributed teams. Boost focus, relieve desk strain, and nurture sustainable vitality."
            />

            {/* Value Metrics Section */}
            <section className="py-12 sm:py-16 px-4 sm:px-8 bg-white border-b border-primary/10">
                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-center">
                    {METRICS.map((m, i) => (
                        <div key={i} className="p-6 rounded-2xl bg-accent/20 border border-primary/5">
                            <p className="font-serif text-4xl sm:text-5xl font-bold text-primary mb-2">{m.stat}</p>
                            <p className="font-sans text-xs sm:text-sm text-text/80 leading-relaxed max-w-xs mx-auto">
                                {m.label}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Program Formats */}
            <section className="py-16 sm:py-20 px-4 sm:px-8 max-w-6xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-14">
                    <span className="text-secondary text-xs font-bold uppercase tracking-widest block mb-2">Tailored For Organizations</span>
                    <h2 className="font-serif text-3xl sm:text-4xl text-primary">Flexible Wellness Formats for Your Team</h2>
                    <p className="text-text/70 text-sm sm:text-base mt-3">
                        Whether you are looking for a high-impact team workshop or ongoing daily memberships, we build packages that match your team's rhythm.
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {PROGRAMS.map((p, i) => (
                        <div key={i} className="bg-white rounded-3xl p-8 border border-primary/10 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <span className="inline-block px-3 py-1 bg-secondary/10 text-secondary rounded-full text-[11px] font-bold uppercase tracking-widest mb-4">
                                    {p.badge}
                                </span>
                                <h3 className="font-serif text-2xl text-text mb-3">{p.title}</h3>
                                <p className="font-sans text-xs sm:text-sm text-text/70 leading-relaxed mb-6">
                                    {p.desc}
                                </p>
                                <ul className="space-y-2.5 font-sans text-xs sm:text-sm text-text/80 mb-8">
                                    {p.bullets.map((b, bi) => (
                                        <li key={bi} className="flex items-start gap-2">
                                            <span className="text-secondary mt-0.5">✦</span>
                                            <span>{b}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <a
                                href="#enquiry"
                                onClick={() => setForm((prev) => ({ ...prev, programInterest: p.title }))}
                                className="block w-full py-3 text-center border-2 border-primary text-primary font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-primary hover:text-white transition-colors"
                            >
                                Inquire for This Program →
                            </a>
                        </div>
                    ))}
                </div>
            </section>

            {/* Enterprise Benefits */}
            <section className="py-16 sm:py-20 px-4 sm:px-8 bg-accent/30">
                <div className="max-w-5xl mx-auto">
                    <h2 className="font-serif text-3xl text-primary text-center mb-12">Why People Leaders Choose Shakti Yoga</h2>
                    <div className="grid sm:grid-cols-2 gap-6">
                        {[
                            { title: "No Fluff, Real Lineage Yoga", desc: "Authentic Indian master teachers who observe participant feeds and provide safe, anatomical corrections." },
                            { title: "Multi-Timezone Support", desc: "Live sessions coordinated to suit North American, European, and Asia-Pacific working windows." },
                            { title: "Turnkey Implementation", desc: "We provide calendar invites, Google Meet links, promotional flyers, and monthly attendance tracking." },
                            { title: "Complimentary 45-Min Pilot", desc: "Experience our teaching firsthand with an interactive pilot session before committing to an annual plan." },
                        ].map((b, i) => (
                            <div key={i} className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm">
                                <h4 className="font-serif font-bold text-lg text-text mb-2 flex items-center gap-2">
                                    <span className="text-primary">🌿</span> {b.title}
                                </h4>
                                <p className="text-xs sm:text-sm text-text/70 font-sans leading-relaxed">{b.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Corporate Enquiry Form */}
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
        </main>
    );
}
