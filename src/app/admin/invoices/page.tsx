"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import { PageHeader, PageLoading, StatusBadge, TableActions, ErrorState, ActionButton, Button, inputClass, labelClass } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

type Invoice = {
    id: string; number: string; member: string; email: string;
    amountInr: number; currency: string; taxInr: number; status: string; issuedAt: string;
    [k: string]: unknown;
};

const money = (n: number, currency: string) => {
    try {
        return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
    } catch {
        return `${currency} ${n.toLocaleString("en-IN")}`;
    }
};
const d = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const PAGE_SIZE = 25;

export default function InvoicesPage() {
    const { showToast } = useToast();
    const [rows, setRows] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [voidTarget, setVoidTarget] = useState<Invoice | null>(null);
    const [voidReason, setVoidReason] = useState("");
    const [voiding, setVoiding] = useState(false);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState("");

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
            if (search) params.set("q", search);
            const res = await fetch(`/api/admin/invoices?${params}`);
            if (res.ok) {
                const data = await res.json();
                setRows(data.invoices || []);
                setTotalCount(data.totalCount ?? 0);
            } else {
                setLoadError(true);
            }
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [page, search]);
    useEffect(() => { load(); }, [load]);

    const confirmVoid = async () => {
        const invoice = voidTarget;
        if (!invoice) return;
        if (!voidReason.trim()) return showToast("error", "A reason is required.");
        setVoiding(true);
        try {
            const res = await fetch(`/api/admin/invoices/${invoice.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: voidReason.trim() }),
            });
            if (!res.ok) {
                showToast("error", (await res.json().catch(() => ({}))).error || "Could not void invoice");
                return;
            }
            showToast("success", `${invoice.number} voided.`);
            setVoidTarget(null);
            setVoidReason("");
            load();
        } finally {
            setVoiding(false);
        }
    };

    if (loading) return <PageLoading title="Invoices" />;

    return (
        <div>
            <PageHeader title="Invoices" subtitle="Auto-issued on every successful payment. Download a copy here." />
            {loadError ? (
                <ErrorState message="Could not load invoices." onRetry={load} />
            ) : (
                <DTable
                    data={rows}
                    columns={[
                        { header: "Number", accessor: "number", className: "font-mono text-sm" },
                        { header: "Member", accessor: (i: Invoice) => (
                            <div><div className="font-medium">{i.member}</div><div className="text-xs text-gray-400">{i.email}</div></div>
                        ) },
                        { header: "Amount", accessor: (i: Invoice) => money(i.amountInr, i.currency || "INR") },
                        { header: "Status", accessor: (i: Invoice) => <StatusBadge status={i.status} /> },
                        { header: "Issued", accessor: (i: Invoice) => d(i.issuedAt) },
                    ]}
                    title="Invoices"
                    server={{
                        page,
                        pageSize: PAGE_SIZE,
                        totalCount,
                        onPageChange: setPage,
                        onSearchChange: (q) => { setSearch(q); setPage(1); },
                    }}
                    actions={(i: Invoice) => (
                        <TableActions>
                            <a href={`/api/admin/invoices/${i.id}`} target="_blank" rel="noreferrer"
                                className="text-xs font-semibold text-brand hover:text-brand-strong">Download</a>
                            {i.status !== "VOID" && (
                                <ActionButton tone="danger" onClick={() => { setVoidTarget(i); setVoidReason(""); }}>Void</ActionButton>
                            )}
                        </TableActions>
                    )}
                />
            )}

            {voidTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
                    onClick={() => !voiding && setVoidTarget(null)}
                >
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="void-dialog-title"
                        className="bg-surface border border-hairline rounded-card shadow-overlay w-full max-w-sm p-6 animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 id="void-dialog-title" className="font-semibold text-ink text-lg mb-2">
                            Void invoice {voidTarget.number}?
                        </h3>
                        <p className="text-sm text-ink-muted mb-4">
                            This doesn&apos;t refund the payment.
                        </p>
                        <label htmlFor="void-reason" className={labelClass}>
                            Reason
                        </label>
                        <input
                            id="void-reason"
                            type="text"
                            placeholder="e.g. Issued in error"
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            className={inputClass}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="secondary" onClick={() => setVoidTarget(null)} disabled={voiding}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={confirmVoid} loading={voiding} disabled={!voidReason.trim()}>
                                Void invoice
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
