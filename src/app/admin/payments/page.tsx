"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues, type FieldDef } from "@/components/admin/EntityFormModal";
import { formatPrice } from "@/lib/pricing";
import { PageHeader, PageLoading, Badge, Button, TableActions, ActionButton, type Tone } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

type PaymentStatus = "CREATED" | "PAID" | "FAILED" | "REFUNDED";

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
    createdAt: string;
    // DTable's generic requires an index signature.
    [key: string]: unknown;
};

const STATUS_TONE: Record<Payment["status"], Tone> = {
    PAID: "green",
    CREATED: "amber",
    FAILED: "red",
    REFUNDED: "blue",
};

const STATUS_FILTER = [
    { label: "Paid", value: "PAID" },
    { label: "Created", value: "CREATED" },
    { label: "Failed", value: "FAILED" },
    { label: "Refunded", value: "REFUNDED" },
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
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "currency", label: "Currency", type: "select", options: [{ label: "INR", value: "INR" }, { label: "USD", value: "USD" }] },
    { name: "planType", label: "Plan", type: "select", options: [
        { label: "Everyday Yoga", value: "EVERYDAY_YOGA" }, { label: "Yoga Therapy", value: "YOGA_THERAPY" },
        { label: "Starter", value: "STARTER" }, { label: "Family", value: "FAMILY" }, { label: "Trial", value: "TRIAL" },
    ] },
    { name: "note", label: "Note (e.g. bank transfer ref)", type: "textarea" },
];

function PaymentsTable() {
    const initialStatus = useSearchParams().get("status");
    const { showToast } = useToast();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [capped, setCapped] = useState(false);
    const [manualOpen, setManualOpen] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const fetchPayments = useCallback(async () => {
        try {
            const qs = initialStatus ? `?status=${encodeURIComponent(initialStatus)}` : "";
            const res = await fetch(`/api/admin/payments${qs}`);
            if (res.ok) {
                const data = await res.json();
                setPayments(data.payments || []);
                setCapped(!!data.capped);
            }
        } catch (error) {
            console.error("Failed to fetch payments:", error);
        } finally {
            setLoading(false);
        }
    }, [initialStatus]);

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

    const refund = async (p: Payment) => {
        const partial = prompt(
            `Refund amount for ${p.member} (max ${p.amount} ${p.currency}). Leave blank for a full refund.`,
            "",
        );
        if (partial === null) return;
        const amount = partial.trim() ? Number(partial) : undefined;
        setBusyId(p.id);
        try {
            const res = await fetch(`/api/admin/payments/${p.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "refund", amount }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Refund failed");
            showToast("success", json.partial ? "Partial refund issued." : "Payment refunded.");
            fetchPayments();
        } catch (e) {
            showToast("error", e instanceof Error ? e.message : "Refund failed");
        } finally {
            setBusyId(null);
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
            <PageHeader
                title="Payments Ledger"
                subtitle="Real-time transaction ledger of member checkouts, subscription renewals, refunds, and offline manual entries."
            >
                <Button onClick={() => setManualOpen(true)}>Record payment</Button>
            </PageHeader>
            {initialStatus && (
                <p className="mb-3 text-xs text-gray-500">
                    Filtered to <span className="font-semibold">{initialStatus}</span> payments.{" "}
                    <a href="/admin/payments" className="text-brand font-semibold">Show all</a>
                </p>
            )}
            {capped && (
                <p className="mb-4 text-xs text-amber-600">
                    Showing the most recent 1,000 payments. Use search or a status filter to narrow older records.
                </p>
            )}
            <DTable
                data={payments}
                columns={columns}
                title="Payments"
                filters={initialStatus ? undefined : [{ key: "status", label: "Status", options: STATUS_FILTER }]}
                actions={(p: Payment) =>
                    p.status === "PAID" ? (
                        <TableActions>
                            <ActionButton tone="danger" disabled={busyId === p.id} onClick={() => refund(p)}>
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
                    initial={{ currency: "INR", planType: "EVERYDAY_YOGA" }}
                    onCancel={() => setManualOpen(false)}
                    onSubmit={recordManual}
                />
            )}
        </div>
    );
}

export default function AdminPaymentsPage() {
    return (
        <Suspense fallback={<PageLoading title="Payments" />}>
            <PaymentsTable />
        </Suspense>
    );
}
