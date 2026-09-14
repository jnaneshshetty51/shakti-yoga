"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/admin/Toast";
import { PageHeader, PageLoading, ErrorState, Card, ActionButton, inputClass, labelClass, useConfirmDialog } from "@/components/ui";

type Rule = {
    id: string; dayOfWeek: string | null; date: string | null;
    startTime: string; endTime: string; slotMinutes: number; active: boolean;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TeacherAvailabilityPage() {
    const { showToast } = useToast();
    const { confirm, dialog } = useConfirmDialog();
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ mode: "weekly", dayOfWeek: "Mon", date: "", startTime: "09:00", endTime: "17:00", slotMinutes: 45 });

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/teacher/availability", { cache: "no-store" });
            if (!res.ok) throw new Error("Failed to load availability");
            setRules((await res.json()).rules);
            setLoadError(null);
        } catch (err) {
            console.error(err);
            setLoadError("Could not load your availability.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const add = async () => {
        setSaving(true);
        try {
            const body = form.mode === "weekly"
                ? { dayOfWeek: form.dayOfWeek, startTime: form.startTime, endTime: form.endTime, slotMinutes: form.slotMinutes }
                : { date: form.date, startTime: form.startTime, endTime: form.endTime, slotMinutes: form.slotMinutes };
            const res = await fetch("/api/teacher/availability", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                showToast("error", d.error || "Could not add");
                return;
            }
            showToast("success", "Availability added");
            load();
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id: string) => {
        const ok = await confirm({ title: "Remove this availability rule?", tone: "danger", confirmLabel: "Remove" });
        if (!ok) return;
        const res = await fetch(`/api/teacher/availability?id=${id}`, { method: "DELETE" });
        if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            showToast("error", d.error || "Could not remove this rule");
            return;
        }
        load();
    };

    const weekly = rules.filter((r) => r.dayOfWeek);
    const oneOff = rules.filter((r) => r.date);

    if (loading) return <PageLoading title="Availability" />;
    if (loadError && rules.length === 0) return <ErrorState message={loadError} onRetry={load} />;

    return (
        <div>
            {dialog}
            <PageHeader title="Availability" subtitle="The windows when members can book a 1:1 session with you." />

            <Card padded className="mb-8 max-w-2xl">
                <h2 className="font-bold text-gray-800 mb-4">Add a window</h2>
                <div className="inline-flex gap-1 p-1 bg-gray-100 rounded-full mb-4">
                    {(["weekly", "date"] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setForm((f) => ({ ...f, mode: m }))}
                            className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors ${form.mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                        >
                            {m === "weekly" ? "Every week" : "Specific date"}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {form.mode === "weekly" ? (
                        <div>
                            <label htmlFor="avail-day" className={labelClass}>Weekday</label>
                            <select id="avail-day" value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))} className={inputClass}>
                                {DAYS.map((d) => <option key={d}>{d}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="avail-date" className={labelClass}>Date</label>
                            <input id="avail-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputClass} />
                        </div>
                    )}
                    <div>
                        <label htmlFor="avail-slot" className={labelClass}>Slot length</label>
                        <select id="avail-slot" value={form.slotMinutes} onChange={(e) => setForm((f) => ({ ...f, slotMinutes: Number(e.target.value) }))} className={inputClass}>
                            {[30, 45, 60, 90].map((n) => <option key={n} value={n}>{n} min</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="avail-start" className={labelClass}>From (IST, 24h)</label>
                        <input id="avail-start" type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="avail-end" className={labelClass}>To (IST, 24h)</label>
                        <input id="avail-end" type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className={inputClass} />
                    </div>
                </div>
                <button onClick={add} disabled={saving} className="mt-4 px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {saving ? "Adding…" : "Add window"}
                </button>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                <section>
                    <h3 className="font-bold text-gray-800 mb-3">Weekly</h3>
                    {weekly.length === 0 ? <p className="text-sm text-gray-400 italic">None set.</p> : (
                        <ul className="space-y-2">
                            {weekly.map((r) => (
                                <li key={r.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm">
                                    <span className="text-gray-600"><b className="text-gray-800">{r.dayOfWeek}</b> {r.startTime}–{r.endTime} · {r.slotMinutes}m</span>
                                    <ActionButton tone="danger" onClick={() => remove(r.id)}>Remove</ActionButton>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
                <section>
                    <h3 className="font-bold text-gray-800 mb-3">Specific dates</h3>
                    {oneOff.length === 0 ? <p className="text-sm text-gray-400 italic">None set.</p> : (
                        <ul className="space-y-2">
                            {oneOff.map((r) => (
                                <li key={r.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm">
                                    <span className="text-gray-600"><b className="text-gray-800">{r.date}</b> {r.startTime}–{r.endTime} · {r.slotMinutes}m</span>
                                    <ActionButton tone="danger" onClick={() => remove(r.id)}>Remove</ActionButton>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
