"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues, type FieldDef } from "@/components/admin/EntityFormModal";
import { formatPrice } from "@/lib/pricing";
import { PageHeader, PageLoading, Button, StatusBadge, TableActions, ActionButton } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

export type Subscription = {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    plan: string;
    planType: string;
    interval: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    paused: boolean;
    renewalDate: string;
    [key: string]: unknown;
};

const STATUS_OPTIONS = [
    { label: "Active", value: "ACTIVE" },
    { label: "Cancelled", value: "CANCELLED" },
    { label: "Paused", value: "PAUSED" },
    { label: "Trial", value: "TRIAL" },
    { label: "Expired", value: "EXPIRED" },
];
const PLAN_OPTIONS = [
    { label: "Everyday Yoga", value: "EVERYDAY_YOGA" },
    { label: "Yoga Therapy", value: "YOGA_THERAPY" },
    { label: "Starter", value: "STARTER" },
    { label: "Family", value: "FAMILY" },
    { label: "Trial", value: "TRIAL" },
];
const PLAN_KEY_OPTIONS = [
    { label: "Starter (monthly)", value: "starter" },
    { label: "Everyday Yoga (monthly)", value: "everyday" },
    { label: "Everyday Yoga (annual)", value: "everyday_annual" },
    { label: "Family (monthly)", value: "family" },
    { label: "Family (annual)", value: "family_annual" },
    { label: "Yoga Therapy (monthly)", value: "therapy" },
    { label: "Yoga Therapy (annual)", value: "therapy_annual" },
];

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function AdminSubscriptionsPage() {
    const { showToast } = useToast();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Subscription | null>(null);
    const [creating, setCreating] = useState(false);
    const [search, setSearch] = useState("");

    const fetchSubscriptions = useCallback(async () => {
        try {
            const qs = search ? `?q=${encodeURIComponent(search)}` : "";
            const response = await fetch(`/api/admin/subscriptions${qs}`);
            if (response.ok) setSubscriptions((await response.json()).subscriptions || []);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

    const columns = [
        { header: "User", accessor: (s: Subscription) => (
            <div><div className="font-bold text-gray-800">{s.userName}</div>
                <div className="text-xs text-gray-400">{s.userEmail}</div></div>
        ) },
        { header: "Plan", accessor: (s: Subscription) => <span className="capitalize">{String(s.plan).replace(/_/g, " ")}</span> },
        { header: "Amount", accessor: (s: Subscription) => formatPrice(s.amount, s.currency) },
        { header: "Status", accessor: (s: Subscription) => <StatusBadge status={s.paused ? "PAUSED" : s.status} /> },
        { header: "Renewal", accessor: (s: Subscription) => fmtDate(s.renewalDate) },
        { header: "Via", accessor: (s: Subscription) => <span className="text-xs text-gray-400">{s.provider}</span> },
    ];

    const patch = async (payload: Record<string, unknown>) => {
        const res = await fetch("/api/admin/subscriptions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Update failed");
        fetchSubscriptions();
    };

    const submitEdit = async (values: EntityValues) => {
        await patch({
            id: editing?.id,
            status: values.status,
            planType: values.planType,
            amount: values.amount,
            renewalDate: values.renewalDate || undefined,
            extendDays: values.extendDays ? Number(values.extendDays) : undefined,
            reason: values.reason || undefined,
        });
        setEditing(null);
        showToast("success", "Subscription updated.");
    };

    const create = async (values: EntityValues) => {
        const res = await fetch("/api/admin/subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: values.email, planKey: values.planKey, amount: values.amount || undefined }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not activate");
        setCreating(false);
        showToast("success", "Plan activated.");
        fetchSubscriptions();
    };

    const togglePause = async (s: Subscription) => {
        const next = !s.paused;
        if (!confirm(`${next ? "Pause" : "Resume"} ${s.userName}'s subscription?`)) return;
        try { await patch({ id: s.id, pause: next }); showToast("success", next ? "Paused." : "Resumed."); }
        catch (e) { showToast("error", e instanceof Error ? e.message : "Failed"); }
    };

    const handleDelete = async (s: Subscription) => {
        if (!confirm(`Delete ${s.userName}'s subscription record? (Does not refund.)`)) return;
        await fetch(`/api/admin/subscriptions?id=${s.id}`, { method: "DELETE" });
        fetchSubscriptions();
    };

    const bulkCancel = async (ids: string[]) => {
        if (!confirm(`Cancel ${ids.length} subscription(s)? Access runs out at each one's current renewal date.`)) return;
        const results = await Promise.all(
            ids.map((id) =>
                fetch("/api/admin/subscriptions", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, status: "CANCELLED" }),
                }),
            ),
        );
        const failed = results.filter((r) => !r.ok).length;
        showToast(failed ? "warning" : "success", failed ? `${failed} of ${ids.length} could not be cancelled` : `${ids.length} subscription(s) cancelled`);
        fetchSubscriptions();
    };

    if (loading) return <PageLoading title="Subscriptions" />;

    const editFields: FieldDef[] = [
        { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTIONS },
        { name: "planType", label: "Plan type", type: "select", options: PLAN_OPTIONS },
        { name: "amount", label: "Amount", type: "number" },
        { name: "renewalDate", label: "Renewal date", type: "date" },
        { name: "extendDays", label: "…or extend by N days", type: "number" },
        { name: "reason", label: "Reason (audit note)", type: "text" },
    ];

    return (
        <div>
            <PageHeader title="Subscriptions" subtitle="Manage member plans, billing state and renewals.">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search member…"
                    className="rounded-control border border-hairline px-3 py-1.5 text-sm" />
                <Button onClick={() => setCreating(true)}>Activate a plan</Button>
            </PageHeader>

            <DTable
                data={subscriptions}
                columns={columns}
                title="Subscriptions"
                enableBulkActions
                bulkActions={[{ label: "Cancel selected", tone: "danger", onClick: bulkCancel }]}
                actions={(s) => (
                    <TableActions>
                        <ActionButton onClick={() => setEditing(s)}>Edit</ActionButton>
                        <ActionButton onClick={() => togglePause(s)}>{s.paused ? "Resume" : "Pause"}</ActionButton>
                        <ActionButton tone="danger" onClick={() => handleDelete(s)}>Delete</ActionButton>
                    </TableActions>
                )}
            />

            {editing && (
                <EntityFormModal
                    title={`${editing.userName}'s subscription`}
                    onCancel={() => setEditing(null)}
                    onSubmit={submitEdit}
                    fields={editFields}
                    initial={{
                        status: editing.status,
                        planType: editing.planType,
                        amount: editing.amount,
                        renewalDate: editing.renewalDate.slice(0, 10),
                    }}
                />
            )}

            {creating && (
                <EntityFormModal
                    title="Activate a plan"
                    submitLabel="Activate"
                    onCancel={() => setCreating(false)}
                    onSubmit={create}
                    fields={[
                        { name: "email", label: "Member email", type: "email", required: true },
                        { name: "planKey", label: "Plan", type: "select", required: true, options: PLAN_KEY_OPTIONS },
                        { name: "amount", label: "Amount (blank = list price)", type: "number" },
                    ]}
                />
            )}
        </div>
    );
}
