"use client";

import { use, useEffect, useState } from "react";

interface Retreat {
    id: string;
    kind: "RETREAT" | "WORKSHOP" | "EVENT";
    name: string;
    location: string | null;
    startDate: string;
    endDate: string;
    description: string | null;
    capacity: number | null;
    price: number | null;
    currency: string;
}

const KIND_LABEL: Record<string, string> = { RETREAT: "Retreat", WORKSHOP: "Workshop", EVENT: "Event" };

export default function RetreatDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [retreat, setRetreat] = useState<Retreat | null | undefined>(undefined);
    const [form, setForm] = useState({ name: "", email: "", phone: "", participantsCount: "1", message: "" });
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/retreats/${id}`)
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((d) => setRetreat(d.retreat))
            .catch(() => setRetreat(null));
    }, [id]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`/api/retreats/${id}/enquire`, {
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

    if (retreat === undefined) return <div className="max-w-2xl mx-auto px-4 py-16 text-gray-400">Loading…</div>;
    if (retreat === null) return <div className="max-w-2xl mx-auto px-4 py-16 text-gray-400">Not found.</div>;

    return (
        <div className="max-w-2xl mx-auto px-4 py-16">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">{KIND_LABEL[retreat.kind]}</span>
            <h1 className="font-serif text-3xl text-gray-800 mt-1 mb-2">{retreat.name}</h1>
            <p className="text-gray-500 mb-1">
                {new Date(retreat.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {" – "}
                {new Date(retreat.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            {retreat.location && <p className="text-gray-500 mb-4">{retreat.location}</p>}
            {retreat.description && <p className="text-gray-600 mb-8 whitespace-pre-line">{retreat.description}</p>}

            <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-6">
                <h2 className="font-bold text-gray-800 mb-4">Enquire</h2>
                {done ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                        Thanks — we&rsquo;ll be in touch with confirmation and payment details.
                    </div>
                ) : (
                    <form onSubmit={submit} className="space-y-3">
                        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </div>
    );
}
