"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, PageLoading, Card, Badge, ErrorState, useConfirmDialog } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

type PayoutRow = {
    teacherId: string;
    name: string;
    email: string;
    classes: number;
    sessions: number;
    classRate: number;
    sessionRate: number;
    amount: number;
    payoutId: string | null;
    status: "PENDING" | "PAID" | null;
    paidAt: string | null;
};

type PayoutsData = {
    month: string;
    studioRates: { class: number; session: number };
    rows: PayoutRow[];
};

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

function monthLabel(key: string) {
    const [y, m] = key.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
function shiftMonth(key: string, delta: number) {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function currentMonthKey() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function AdminPayoutsContent({ embedded = false }: { embedded?: boolean } = {}) {
    const { showToast } = useToast();
    const { confirm, dialog } = useConfirmDialog();
    const [month, setMonth] = useState(currentMonthKey());
    const [data, setData] = useState<PayoutsData | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [recording, setRecording] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const res = await fetch(`/api/admin/staff/payouts?month=${month}`);
            if (!res.ok) throw new Error();
            setData(await res.json());
        } catch {
            setLoadError(true);
        }
    }, [month]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount / month-change
    useEffect(() => { load(); }, [load]);

    const recordPayout = async (row: PayoutRow) => {
        const ok = await confirm({
            title: `Record payout for ${row.name}?`,
            message: `${row.classes} class${row.classes === 1 ? "" : "es"} × ${inr(row.classRate)} + ${row.sessions} session${row.sessions === 1 ? "" : "s"} × ${inr(row.sessionRate)} = ${inr(row.amount)} for ${monthLabel(data!.month)}. This locks in these figures — a later rate change won't affect it.`,
            confirmLabel: "Record as paid",
        });
        if (!ok) return;

        setRecording(row.teacherId);
        try {
            const res = await fetch("/api/admin/staff/payouts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teacherId: row.teacherId, month }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || "Could not record payout.");
            showToast("success", `Payout recorded for ${row.name}.`);
            load();
        } catch (err) {
            showToast("error", err instanceof Error ? err.message : "Could not record payout.");
        } finally {
            setRecording(null);
        }
    };

    if (loadError && !data) return <ErrorState message="Could not load payouts." onRetry={load} />;
    if (!data) return <PageLoading title="Payouts" />;

    const totalPending = data.rows.filter((r) => r.status === "PENDING").reduce((s, r) => s + r.amount, 0);

    return (
        <div>
            {dialog}
            {!embedded && <PageHeader title="Teacher Payouts" subtitle="What's owed to teachers and therapists, and what's already been paid." />}

            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="px-3 py-1.5 rounded-control border border-hairline text-sm hover:bg-surface-hover">←</button>
                    <span className="text-sm font-semibold text-ink min-w-[10rem] text-center">{monthLabel(data.month)}</span>
                    <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="px-3 py-1.5 rounded-control border border-hairline text-sm hover:bg-surface-hover">→</button>
                </div>
                <div className="text-sm text-ink-subtle">
                    Studio rates: {inr(data.studioRates.class)}/class · {inr(data.studioRates.session)}/session
                    <span className="ml-2 text-xs text-ink-subtle">(a teacher's own rate on their Staff profile overrides these)</span>
                </div>
            </div>

            <Card className="overflow-hidden mb-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/70 text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Teacher</th>
                                <th className="px-4 py-3 text-right">Classes</th>
                                <th className="px-4 py-3 text-right">Sessions</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data.rows.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No teachers yet.</td></tr>
                            ) : data.rows.map((r) => (
                                <tr key={r.teacherId} className="text-gray-600">
                                    <td className="px-4 py-2.5">
                                        <div className="font-medium text-ink">{r.name}</div>
                                        <div className="text-xs text-ink-subtle">{r.email}</div>
                                    </td>
                                    <td className="px-4 py-2.5 text-right tabular-nums">{r.classes}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums">{r.sessions}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-800">{inr(r.amount)}</td>
                                    <td className="px-4 py-2.5">
                                        {r.status === "PAID" ? (
                                            <Badge tone="green">Paid{r.paidAt ? ` · ${new Date(r.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}</Badge>
                                        ) : r.status === "PENDING" ? (
                                            <Badge tone="amber">Pending</Badge>
                                        ) : (
                                            <span className="text-gray-300 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        {r.status === "PENDING" && (
                                            <button
                                                onClick={() => recordPayout(r)}
                                                disabled={recording === r.teacherId}
                                                className="text-xs font-semibold text-brand hover:text-brand-strong disabled:opacity-50"
                                            >
                                                {recording === r.teacherId ? "Recording…" : "Record payout"}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {totalPending > 0 && (
                <p className="text-sm text-ink-subtle">Total pending this month: <span className="font-semibold text-ink">{inr(totalPending)}</span></p>
            )}
        </div>
    );
}

export default function AdminPayoutsPage() {
    return <AdminPayoutsContent />;
}
