"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Button, ActionButton, inputClass } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

type M = {
    id: string; takenAt: string;
    painScore: number | null; mobilityScore: number | null; sleepScore: number | null; stressScore: number | null;
    weightKg: number | null; note: string | null; recordedBy: string | null;
};

const METRICS: { key: keyof M; label: string; better: "up" | "down" }[] = [
    { key: "painScore", label: "Pain", better: "down" },
    { key: "mobilityScore", label: "Mobility", better: "up" },
    { key: "sleepScore", label: "Sleep", better: "up" },
    { key: "stressScore", label: "Stress", better: "down" },
];
const d = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Spark({ values }: { values: (number | null)[] }) {
    const pts = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);
    if (pts.length < 2) return <span className="text-ink-subtle text-xs">—</span>;
    const w = 80, h = 20, max = 10;
    const x = (i: number) => (i / (values.length - 1)) * w;
    const y = (v: number) => h - (v / max) * h;
    const path = pts.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
    return (
        <svg width={w} height={h} className="inline-block align-middle">
            <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand" />
        </svg>
    );
}

export function MeasurementsPanel({ memberId }: { memberId: string }) {
    const { showToast } = useToast();
    const [rows, setRows] = useState<M[] | null>(null);
    const [form, setForm] = useState<Record<string, string>>({});
    const [adding, setAdding] = useState(false);

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/members/${memberId}/measurements`);
        if (res.ok) setRows((await res.json()).measurements);
    }, [memberId]);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    useEffect(() => { load(); }, [load]);

    const add = async () => {
        const res = await fetch(`/api/admin/members/${memberId}/measurements`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        if (!res.ok) return showToast("error", (await res.json().catch(() => ({}))).error || "Failed");
        setForm({});
        setAdding(false);
        showToast("success", "Reading added.");
        load();
    };

    const del = async (mid: string) => {
        if (!confirm("Delete this reading?")) return;
        await fetch(`/api/admin/members/${memberId}/measurements?measurementId=${mid}`, { method: "DELETE" });
        load();
    };

    if (!rows) return null;

    return (
        <Card padded>
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-ink text-sm">Therapy progress</h3>
                <Button size="sm" variant="ghost" onClick={() => setAdding((v) => !v)}>{adding ? "Cancel" : "Add reading"}</Button>
            </div>

            {adding && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <label className="text-xs">Pain 0-10<input className={inputClass} type="number" value={form.painScore ?? ""} onChange={(e) => setForm((f) => ({ ...f, painScore: e.target.value }))} /></label>
                    <label className="text-xs">Mobility 0-10<input className={inputClass} type="number" value={form.mobilityScore ?? ""} onChange={(e) => setForm((f) => ({ ...f, mobilityScore: e.target.value }))} /></label>
                    <label className="text-xs">Sleep 0-10<input className={inputClass} type="number" value={form.sleepScore ?? ""} onChange={(e) => setForm((f) => ({ ...f, sleepScore: e.target.value }))} /></label>
                    <label className="text-xs">Stress 0-10<input className={inputClass} type="number" value={form.stressScore ?? ""} onChange={(e) => setForm((f) => ({ ...f, stressScore: e.target.value }))} /></label>
                    <label className="text-xs">Weight kg<input className={inputClass} type="number" value={form.weightKg ?? ""} onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))} /></label>
                    <label className="text-xs">Note<input className={inputClass} value={form.note ?? ""} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></label>
                    <div className="col-span-3"><Button size="sm" onClick={add}>Save reading</Button></div>
                </div>
            )}

            {rows.length === 0 ? (
                <p className="text-sm text-ink-subtle">No readings yet.</p>
            ) : (
                <>
                    <table className="w-full text-xs mb-3">
                        <tbody>
                            {METRICS.map((m) => {
                                const series = rows.map((r) => r[m.key] as number | null);
                                const first = series.find((v) => v != null);
                                const last = [...series].reverse().find((v) => v != null);
                                const delta = first != null && last != null ? last - first : null;
                                const good = delta != null && ((m.better === "down" && delta < 0) || (m.better === "up" && delta > 0));
                                return (
                                    <tr key={String(m.key)}>
                                        <td className="py-1 text-ink-subtle w-20">{m.label}</td>
                                        <td className="py-1"><Spark values={series} /></td>
                                        <td className={`py-1 text-right tabular-nums ${delta == null ? "text-ink-subtle" : good ? "text-green-700" : "text-red-600"}`}>
                                            {delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <ul className="divide-y divide-hairline text-sm">
                        {[...rows].reverse().slice(0, 8).map((r) => (
                            <li key={r.id} className="flex items-center justify-between py-1.5">
                                <span>
                                    {d(r.takenAt)}
                                    <span className="text-ink-subtle"> · P{r.painScore ?? "-"} M{r.mobilityScore ?? "-"} S{r.sleepScore ?? "-"} St{r.stressScore ?? "-"}{r.weightKg ? ` · ${r.weightKg}kg` : ""}</span>
                                </span>
                                <ActionButton tone="danger" onClick={() => del(r.id)}>Delete</ActionButton>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </Card>
    );
}
