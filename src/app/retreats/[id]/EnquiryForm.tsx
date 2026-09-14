"use client";

import { useState } from "react";

export default function EnquiryForm({ retreatId }: { retreatId: string }) {
    const [form, setForm] = useState({ name: "", email: "", phone: "", participantsCount: "1", message: "" });
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`/api/retreats/${retreatId}/enquire`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, participantsCount: Number(form.participantsCount) }),
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
        <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-6">
            <h2 className="font-bold text-gray-800 mb-4">Enquire</h2>
            {done ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                    Thanks — we&rsquo;ll be in touch within 1 business day with confirmation and payment details.
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-3">
                    {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
                    <div className="grid sm:grid-cols-2 gap-3">
                        <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <input type="number" min={1} max={20} placeholder="Participants" value={form.participantsCount}
                            onChange={(e) => setForm({ ...form, participantsCount: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <textarea placeholder="Anything we should know?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <button disabled={busy} className="px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
                        {busy ? "Sending…" : "Send enquiry"}
                    </button>
                </form>
            )}
        </div>
    );
}
