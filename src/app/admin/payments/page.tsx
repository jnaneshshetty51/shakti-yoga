"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues, type FieldDef } from "@/components/admin/EntityFormModal";
import { formatPrice, PLAN_OPTIONS } from "@/lib/pricing";
import { PageHeader, PageLoading, Badge, Button, TableActions, ActionButton, inputClass, labelClass, type Tone } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

type PaymentStatus = "CREATED" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";

type Payment = {
    id: string;
    member: string;
    email: string;
    userId: string;
    planType: string;
    planKey: string | null;
    amount: number;
    currency: string;
    status: PaymentStatus;
    provider: string;
    providerPaymentId: string;
    creditApplied: number;
    refereeDiscountApplied: number;
    refundedAmount: number;
    createdAt: string;
    // DTable's generic requires an index signature.
    [key: string]: unknown;
};

const STATUS_TONE: Record<Payment["status"], Tone> = {
    PAID: "green",
    CREATED: "amber",
    FAILED: "red",
    REFUNDED: "blue",
    PARTIALLY_REFUNDED: "purple",
};

const STATUS_FILTER = [
    { label: "Paid", value: "PAID" },
    { label: "Created", value: "CREATED" },
    { label: "Failed", value: "FAILED" },
    { label: "Refunded", value: "REFUNDED" },
    { label: "Partially refunded", value: "PARTIALLY_REFUNDED" },
];

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

const MANUAL_FIELDS: FieldDef[] = [
    { name: "email", label: "Member email", type: "email", required: true },
    { name: "planKey", label: "Plan", type: "select", required: true, options: PLAN_OPTIONS },
    { name: "amount", label: "Amount collected", type: "number", required: true },
    { name: "currency", label: "Currency", type: "select", options: [{ label: "INR", value: "INR" }, { label: "USD", value: "USD" }] },
    { name: "method", label: "Payment method", type: "select", required: true, options: [
        { label: "Cash", value: "cash" }, { label: "UPI", value: "upi" }, { label: "Bank transfer", value: "bank_transfer" },
    ] },
    { name: "renew", label: "Also renew their subscription from today (uncheck for a historical/backfill entry only)", type: "checkbox" },
    { name: "note", label: "Note (e.g. bank transfer ref)", type: "textarea" },
];

const PAGE_SIZE = 25;

function PaymentsTable({ embedded = false }: { embedded?: boolean }) {
    const initialStatus = useSearchParams().get("status");
    const { showToast } = useToast();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [manualOpen, setManualOpen] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
    const [refundAmount, setRefundAmount] = useState("");
    const [refunding, setRefunding] = useState(false);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState(initialStatus ?? "");

    const fetchPayments = useCallback(async () => {
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
            if (search) params.set("q", search);
            if (statusFilter) params.set("status", statusFilter);
            const res = await fetch(`/api/admin/payments?${params}`);
            if (res.ok) {
                const data = await res.json();
                setPayments(data.payments || []);
                setTotalCount(data.totalCount ?? 0);
            }
        } catch (error) {
            console.error("Failed to fetch payments:", error);
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const recordManual = async (values: EntityValues) => {
        const res = await fetch("/api/admin/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not record");
        setManualOpen(false);
        showToast("success", "Payment recorded.");
        fetchPayments();
    };

    const remainingOf = (p: Payment) => Math.round((p.amount - (p.refundedAmount || 0)) * 100) / 100;

    const confirmRefund = async () => {
        const p = refundTarget;
        if (!p) return;
        const amount = refundAmount.trim() ? Number(refundAmount) : undefined;
        setRefunding(true);
        try {
            const res = await fetch(`/api/admin/payments/${p.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "refund", amount }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Refund failed");
            showToast("success", json.partial ? "Partial refund issued." : "Payment refunded.");
            setRefundTarget(null);
            setRefundAmount("");
            fetchPayments();
        } catch (e) {
            showToast("error", e instanceof Error ? e.message : "Refund failed");
        } finally {
            setRefunding(false);
        }
    };

    const columns = [
        {
            header: "Member",
            accessor: (p: Payment) => (
                <div>
                    <div className="font-semibold text-gray-800">{p.member}</div>
                    <div className="text-xs text-gray-400">{p.email}</div>
                </div>
            ),
        },
        { header: "Plan", accessor: (p: Payment) => <Badge>{p.planKey || p.planType}</Badge> },
        {
            header: "Amount",
            accessor: (p: Payment) => {
                const discount = p.creditApplied + p.refereeDiscountApplied;
                return (
                    <span className="tabular-nums">
                        {formatPrice(p.amount, p.currency)}
                        {discount > 0 && (
                            <span className="ml-1 text-xs text-gray-400">
                                (−{formatPrice(discount, p.currency)})
                            </span>
                        )}
                        {p.refundedAmount > 0 && (
                            <span className="block text-xs text-purple-500">
                                {formatPrice(p.refundedAmount, p.currency)} refunded
                            </span>
                        )}
                    </span>
                );
            },
        },
        { header: "Status", accessor: (p: Payment) => <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge> },
        { header: "Provider", accessor: (p: Payment) => p.provider },
        { header: "Date", accessor: (p: Payment) => <span className="whitespace-nowrap">{fmtDate(p.createdAt)}</span> },
        {
            header: "Reference",
            accessor: (p: Payment) =>
                p.providerPaymentId ? (
                    <span className="font-mono text-xs text-gray-500">{p.providerPaymentId}</span>
                ) : (
                    <span className="text-gray-300">—</span>
                ),
        },
    ];

    if (loading) return <PageLoading title="Payments" />;

    return (
        <div>
            {embedded ? (
                <div className="flex justify-end mb-4">
                    <Button onClick={() => setManualOpen(true)}>Record payment</Button>
                </div>
            ) : (
                <PageHeader
                    title="Payments Ledger"
                    subtitle="Real-time transaction ledger of member checkouts, subscription renewals, refunds, and offline manual entries."
                >
                    <Button onClick={() => setManualOpen(true)}>Record payment</Button>
                </PageHeader>
            )}
            {initialStatus && (
                <p className="mb-3 text-xs text-gray-500">
                    Filtered to <span className="font-semibold">{initialStatus}</span> payments.{" "}
                    <a href={embedded ? "/admin/finance?tab=payments" : "/admin/payments"} className="text-brand font-semibold">Show all</a>
                </p>
            )}
            <DTable
                data={payments}
                columns={columns}
                title="Payments"
                filters={initialStatus ? undefined : [{ key: "status", label: "Status", options: STATUS_FILTER }]}
                server={{
                    page,
                    pageSize: PAGE_SIZE,
                    totalCount,
                    onPageChange: setPage,
                    onSearchChange: (q) => { setSearch(q); setPage(1); },
                    onFilterChange: (key, value) => {
                        if (key === "status") setStatusFilter(value);
                        setPage(1);
                    },
                }}
                actions={(p: Payment) =>
                    p.status === "PAID" || p.status === "PARTIALLY_REFUNDED" ? (
                        <TableActions>
                            <ActionButton
                                tone="danger"
                                disabled={busyId === p.id}
                                onClick={() => { setRefundTarget(p); setRefundAmount(""); }}
                            >
                                Refund
                            </ActionButton>
                        </TableActions>
                    ) : null
                }
            />

            {manualOpen && (
                <EntityFormModal
                    title="Record a payment"
                    submitLabel="Record"
                    fields={MANUAL_FIELDS}
                    initial={{ currency: "INR", planKey: "everyday", method: "cash", renew: true }}
                    onCancel={() => setManualOpen(false)}
                    onSubmit={recordManual}
                />
            )}

            {refundTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
                    onClick={() => !refunding && setRefundTarget(null)}
                >
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="refund-dialog-title"
                        className="bg-surface border border-hairline rounded-card shadow-overlay w-full max-w-sm p-6 animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 id="refund-dialog-title" className="font-semibold text-ink text-lg mb-2">
                            Refund {refundTarget.member}
                        </h3>
                        <p className="text-sm text-ink-muted mb-4">
                            {formatPrice(remainingOf(refundTarget), refundTarget.currency)} of{" "}
                            {formatPrice(refundTarget.amount, refundTarget.currency)} remains refundable
                            {refundTarget.refundedAmount > 0 &&
                                ` (${formatPrice(refundTarget.refundedAmount, refundTarget.currency)} already refunded)`}
                            . This cannot be undone.
                        </p>
                        <label htmlFor="refund-amount" className={labelClass}>
                            Amount to refund (leave blank for the full remaining amount)
                        </label>
                        <input
                            id="refund-amount"
                            type="number"
                            min={0}
                            max={remainingOf(refundTarget)}
                            step="0.01"
                            placeholder={String(remainingOf(refundTarget))}
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            className={inputClass}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="secondary" onClick={() => setRefundTarget(null)} disabled={refunding}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={confirmRefund} loading={refunding}>
                                Issue refund
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function AdminPaymentsContent({ embedded = false }: { embedded?: boolean } = {}) {
    return (
        <Suspense fallback={<PageLoading title="Payments" />}>
            <PaymentsTable embedded={embedded} />
        </Suspense>
    );
}

export default function AdminPaymentsPage() {
    return <AdminPaymentsContent />;
}
