"use client";

import { useCallback, useEffect, useState } from "react";

type Session = {
    id: string; member: string; email: string; type: string;
    status: string; at: string; notes: string; hasLink: boolean;
};

const STATUS_TONE: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-100 text-gray-500",
    NO_SHOW: "bg-red-100 text-red-700",
};

function when(iso: string) {
    return new Date(iso).toLocaleString("en-IN", {
        weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
        timeZone: "Asia/Kolkata",
    });
}

function Row({ s, onSaved }: { s: Session; onSaved: () => void }) {
    const [notes, setNotes] = useState(s.notes);
    const [saving, setSaving] = useState(false);
    const past = new Date(s.at).getTime() < Date.now();

    const patch = async (payload: Record<string, unknown>) => {
        setSaving(true);
        try {
            const res = await fetch("/api/teacher/sessions", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: s.id, ...payload }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                alert(d.error || "Could not save");
                return;
            }
            onSaved();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-100 p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{s.member}</p>
                    <p className="text-xs text-gray-500">{when(s.at)} · <span className="capitalize">{s.type}</span></p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider shrink-0 ${STATUS_TONE[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {s.status.replace("_", " ").toLowerCase()}
                </span>
            </div>

            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Session notes…"
                className="w-full text-sm border border-gray-200 rounded p-2 focus:outline-none focus:border-primary"
            />
            <div className="flex flex-wrap gap-2 mt-2">
                <button
                    onClick={() => patch({ notes })}
                    disabled={saving || notes === s.notes}
                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-primary text-white rounded hover:bg-secondary disabled:opacity-40"
                >
                    Save notes
                </button>
                {past && (s.status === "PENDING" || s.status === "CONFIRMED") && (
                    <>
                        <button onClick={() => patch({ status: "COMPLETED", notes })} disabled={saving} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-green-200 text-green-700 rounded hover:bg-green-50">
                            Mark completed
                        </button>
                        <button onClick={() => patch({ status: "NO_SHOW" })} disabled={saving} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-red-200 text-red-600 rounded hover:bg-red-50">
                            No-show
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function TeacherSessionsPage() {
    const [data, setData] = useState<{ upcoming: Session[]; past: Session[] } | null>(null);
    const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/teacher/sessions", { cache: "no-store" });
            if (res.ok) setData(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const rows = data ? data[tab] : [];

    return (
        <div>
            <h1 className="font-serif text-3xl text-gray-800 mb-6">My Sessions</h1>

            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
                {(["upcoming", "past"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                    >
                        {t} {data && <span className="text-xs text-gray-400">({data[t].length})</span>}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="text-gray-500">Loading…</p>
            ) : rows.length === 0 ? (
                <p className="text-gray-400 italic">No {tab} sessions.</p>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {rows.map((s) => <Row key={s.id} s={s} onSaved={load} />)}
                </div>
            )}
        </div>
    );
}
