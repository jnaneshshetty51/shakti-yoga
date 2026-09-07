"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/admin/Toast";
import { PageHeader, Card, Badge, EmptyState, Tabs, inputClass, statusTone } from "@/components/ui";
import { LuMessageSquare } from "react-icons/lu";

type Session = {
    id: string; member: string; email: string; type: string;
    status: string; at: string; notes: string; hasLink: boolean;
};

function when(iso: string) {
    return new Date(iso).toLocaleString("en-IN", {
        weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
        timeZone: "Asia/Kolkata",
    });
}

function Row({ s, onSaved }: { s: Session; onSaved: () => void }) {
    const { showToast } = useToast();
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
                showToast("error", d.error || "Could not save");
                return;
            }
            showToast("success", "Session updated");
            onSaved();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card padded>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{s.member}</p>
                    <p className="text-xs text-gray-500">{when(s.at)} · <span className="capitalize">{s.type}</span></p>
                </div>
                <Badge tone={statusTone(s.status)}>{s.status.replace("_", " ").toLowerCase()}</Badge>
            </div>

            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Session notes…"
                className={inputClass}
            />
            <div className="flex flex-wrap gap-2 mt-2">
                <button
                    onClick={() => patch({ notes })}
                    disabled={saving || notes === s.notes}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
                >
                    Save notes
                </button>
                {past && (s.status === "PENDING" || s.status === "CONFIRMED") && (
                    <>
                        <button onClick={() => patch({ status: "COMPLETED", notes })} disabled={saving} className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-green-200 text-green-700 hover:bg-green-50">
                            Mark completed
                        </button>
                        <button onClick={() => patch({ status: "NO_SHOW" })} disabled={saving} className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-red-200 text-red-600 hover:bg-red-50">
                            No-show
                        </button>
                    </>
                )}
            </div>
        </Card>
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
            <PageHeader title="My Sessions" subtitle="Write notes and update the status of your 1:1 sessions." />

            <div className="mb-6">
                <Tabs
                    active={tab}
                    onChange={(k) => setTab(k)}
                    tabs={[
                        { key: "upcoming", label: "Upcoming", count: data?.upcoming.length ?? 0 },
                        { key: "past", label: "Past", count: data?.past.length ?? 0 },
                    ]}
                />
            </div>

            {loading ? (
                <p className="text-gray-500">Loading…</p>
            ) : rows.length === 0 ? (
                <Card><EmptyState icon={LuMessageSquare} title={`No ${tab} sessions`} /></Card>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {rows.map((s) => <Row key={s.id} s={s} onSaved={load} />)}
                </div>
            )}
        </div>
    );
}
