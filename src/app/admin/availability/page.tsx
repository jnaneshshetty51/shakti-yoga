"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Card, ActionButton } from "@/components/admin/ui";

interface Rule {
    id: string;
    teacherId: string;
    teacherName: string;
    dayOfWeek: string | null;
    date: string | null;
    startTime: string;
    endTime: string;
    slotMinutes: number;
    active: boolean;
}
interface Teacher { id: string; name: string }
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AvailabilityPage() {
    const [rules, setRules] = useState<Rule[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    const [form, setForm] = useState({ teacherId: "", dayOfWeek: "Mon", startTime: "09:00", endTime: "17:00", slotMinutes: 45 });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/availability");
            const data = await res.json();
            if (res.ok) {
                setRules(data.rules ?? []);
                setTeachers(data.teachers ?? []);
                if (!form.teacherId && data.teachers?.[0]) setForm((f) => ({ ...f, teacherId: data.teachers[0].id }));
            }
        } finally {
            setLoading(false);
        }
    }, [form.teacherId]);

    useEffect(() => { load(); }, [load]);

    const add = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr("");
        const res = await fetch("/api/admin/availability", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { setErr(data.error || "Could not add"); return; }
        load();
    };

    const remove = async (id: string) => {
        if (!confirm("Remove this availability window?")) return;
        await fetch(`/api/admin/availability?id=${id}`, { method: "DELETE" });
        load();
    };

    const [editing, setEditing] = useState<Rule | null>(null);
    const saveEdit = async () => {
        if (!editing) return;
        await fetch("/api/admin/availability", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: editing.id, startTime: editing.startTime, endTime: editing.endTime,
                slotMinutes: editing.slotMinutes, dayOfWeek: editing.dayOfWeek, active: editing.active,
            }),
        });
        setEditing(null);
        load();
    };

    return (
        <div className="max-w-4xl">
            <PageHeader
                title="Teacher Availability"
                subtitle="Weekly windows the 1:1 therapy booking page offers as slots."
            />

            <form onSubmit={add} className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-4 sm:p-6 mb-8 grid gap-3 sm:grid-cols-6 items-end">
                <label className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                    Teacher
                    <select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} className="mt-1 w-full p-2 border border-gray-200 rounded text-sm font-normal normal-case">
                        {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Day
                    <select value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })} className="mt-1 w-full p-2 border border-gray-200 rounded text-sm font-normal">
                        {DAYS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    From
                    <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="mt-1 w-full p-2 border border-gray-200 rounded text-sm font-normal" />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    To
                    <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="mt-1 w-full p-2 border border-gray-200 rounded text-sm font-normal" />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Slot (min)
                    <input type="number" min={15} max={120} value={form.slotMinutes} onChange={(e) => setForm({ ...form, slotMinutes: Number(e.target.value) })} className="mt-1 w-full p-2 border border-gray-200 rounded text-sm font-normal" />
                </label>
                <button className="sm:col-span-6 sm:w-auto px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">Add window</button>
                {err && <p className="sm:col-span-6 text-sm text-red-600">{err}</p>}
            </form>

            <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50/70 text-left text-[11px] uppercase tracking-wider text-gray-400">
                            <th className="px-4 py-3 font-semibold">Teacher</th>
                            <th className="px-4 py-3 font-semibold">Day</th>
                            <th className="px-4 py-3 font-semibold">Window</th>
                            <th className="px-4 py-3 font-semibold">Slot</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
                        {!loading && rules.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">No windows yet — the booking page uses default slots until you add some.</td></tr>}
                        {rules.map((r) => {
                            const ed = editing?.id === r.id ? editing : null;
                            return (
                                <tr key={r.id} className="border-t border-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-800">{r.teacherName}</td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {ed && ed.dayOfWeek ? (
                                            <select value={ed.dayOfWeek} onChange={(e) => setEditing({ ...ed, dayOfWeek: e.target.value })} className="p-1 border border-gray-200 rounded text-sm">
                                                {DAYS.map((d) => <option key={d}>{d}</option>)}
                                            </select>
                                        ) : (r.dayOfWeek ?? r.date)}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums text-gray-600">
                                        {ed ? (
                                            <span className="flex gap-1">
                                                <input type="time" value={ed.startTime} onChange={(e) => setEditing({ ...ed, startTime: e.target.value })} className="p-1 border border-gray-200 rounded text-sm" />
                                                <input type="time" value={ed.endTime} onChange={(e) => setEditing({ ...ed, endTime: e.target.value })} className="p-1 border border-gray-200 rounded text-sm" />
                                            </span>
                                        ) : `${r.startTime}–${r.endTime}`}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {ed ? (
                                            <input type="number" min={15} max={120} value={ed.slotMinutes} onChange={(e) => setEditing({ ...ed, slotMinutes: Number(e.target.value) })} className="w-16 p-1 border border-gray-200 rounded text-sm" />
                                        ) : `${r.slotMinutes}m`}
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        {ed ? (
                                            <>
                                                <ActionButton onClick={saveEdit}>Save</ActionButton>{" "}
                                                <ActionButton onClick={() => setEditing(null)}>Cancel</ActionButton>
                                            </>
                                        ) : (
                                            <>
                                                <ActionButton onClick={() => setEditing(r)}>Edit</ActionButton>{" "}
                                                <ActionButton tone="danger" onClick={() => remove(r.id)}>Remove</ActionButton>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}
