"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/admin/Toast";

type Rule = {
    id: string; dayOfWeek: string | null; date: string | null;
    startTime: string; endTime: string; slotMinutes: number; active: boolean;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TeacherAvailabilityPage() {
    const { showToast } = useToast();
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ mode: "weekly", dayOfWeek: "Mon", date: "", startTime: "09:00", endTime: "17:00", slotMinutes: 45 });

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/teacher/availability", { cache: "no-store" });
            if (res.ok) setRules((await res.json()).rules);
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
        if (!confirm("Remove this availability rule?")) return;
        const res = await fetch(`/api/teacher/availability?id=${id}`, { method: "DELETE" });
        if (res.ok) load();
    };

    const weekly = rules.filter((r) => r.dayOfWeek);
    const oneOff = rules.filter((r) => r.date);

    return (
        <div>
            <h1 className="font-serif text-3xl text-gray-800 mb-2">Availability</h1>
            <p className="text-gray-500 mb-8">The windows when members can book a 1:1 session with you.</p>

            <div className="bg-white rounded-lg border border-gray-100 p-6 mb-8 max-w-2xl">
                <h2 className="font-bold text-gray-800 mb-4">Add a window</h2>
                <div className="flex gap-2 mb-4">
                    {(["weekly", "date"] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setForm((f) => ({ ...f, mode: m }))}
                            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded ${form.mode === m ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
                        >
                            {m === "weekly" ? "Every week" : "Specific date"}
                        </button>
                    ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                    {form.mode === "weekly" ? (
                        <label className="text-sm">
                            <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Weekday</span>
                            <select value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))} className="w-full border border-gray-200 rounded p-2">
                                {DAYS.map((d) => <option key={d}>{d}</option>)}
                            </select>
                        </label>
                    ) : (
                        <label className="text-sm">
                            <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date</span>
                            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full border border-gray-200 rounded p-2" />
                        </label>
                    )}
                    <label className="text-sm">
                        <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Slot length</span>
                        <select value={form.slotMinutes} onChange={(e) => setForm((f) => ({ ...f, slotMinutes: Number(e.target.value) }))} className="w-full border border-gray-200 rounded p-2">
                            {[30, 45, 60, 90].map((n) => <option key={n} value={n}>{n} min</option>)}
                        </select>
                    </label>
                    <label className="text-sm">
                        <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">From (IST, 24h)</span>
                        <input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className="w-full border border-gray-200 rounded p-2" />
                    </label>
                    <label className="text-sm">
                        <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">To (IST, 24h)</span>
                        <input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className="w-full border border-gray-200 rounded p-2" />
                    </label>
                </div>
                <button onClick={add} disabled={saving} className="mt-4 px-4 py-2 bg-primary text-white text-sm font-bold uppercase tracking-widest rounded hover:bg-secondary disabled:opacity-50">
                    {saving ? "Adding…" : "Add window"}
                </button>
            </div>

            {loading ? (
                <p className="text-gray-500">Loading…</p>
            ) : (
                <div className="grid md:grid-cols-2 gap-8 max-w-3xl">
                    <section>
                        <h3 className="font-bold text-gray-800 mb-3">Weekly</h3>
                        {weekly.length === 0 ? <p className="text-sm text-gray-400 italic">None set.</p> : (
                            <ul className="space-y-2">
                                {weekly.map((r) => (
                                    <li key={r.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-4 py-2 text-sm">
                                        <span><b>{r.dayOfWeek}</b> {r.startTime}–{r.endTime} · {r.slotMinutes}m</span>
                                        <button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-600 text-xs font-bold uppercase">Remove</button>
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
                                    <li key={r.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-4 py-2 text-sm">
                                        <span><b>{r.date}</b> {r.startTime}–{r.endTime} · {r.slotMinutes}m</span>
                                        <button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-600 text-xs font-bold uppercase">Remove</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}
