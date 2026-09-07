"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";
import { formatPrice } from "@/lib/pricing";
import { PageHeader, PageLoading, StatusBadge, TableActions, ActionButton } from "@/components/admin/ui";

export type Subscription = {
    id: string;
    userId: string;
    userName: string;
    plan: 'Everyday Yoga' | 'Yoga Therapy' | 'Trial';
    amount: number;
    status: 'Active' | 'Cancelled' | 'Paused' | 'Trial';
    renewalDate: string;
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
    { label: "Trial", value: "TRIAL" },
];

export default function AdminSubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Subscription | null>(null);

    const fetchSubscriptions = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/subscriptions');
            if (response.ok) {
                const data = await response.json();
                setSubscriptions(data.subscriptions || []);
            }
        } catch (error) {
            console.error('Failed to fetch subscriptions:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubscriptions();
    }, [fetchSubscriptions]);

    const columns = [
        { header: "User", accessor: "userName" as keyof Subscription, className: "font-bold text-gray-800" },
        { header: "Plan", accessor: "plan" as keyof Subscription },
        { header: "Amount", accessor: (sub: Subscription) => formatPrice(sub.amount) },
        {
            header: "Status",
            accessor: (sub: Subscription) => <StatusBadge status={sub.status} />,
        },
        { header: "Renewal Date", accessor: "renewalDate" as keyof Subscription },
    ];

    const submitEdit = async (values: EntityValues) => {
        const res = await fetch('/api/admin/subscriptions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editing?.id, status: values.status, planType: values.planType }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Update failed');
        }
        setEditing(null);
        fetchSubscriptions();
    };

    const handleDelete = async (sub: Subscription) => {
        if (!confirm(`Delete ${sub.userName}'s subscription record?`)) return;
        await fetch(`/api/admin/subscriptions?id=${sub.id}`, { method: 'DELETE' });
        fetchSubscriptions();
    };

    if (loading) return <PageLoading title="Subscriptions" />;

    return (
        <div>
            <PageHeader title="Subscriptions" subtitle="Manage member plans, billing, and renewals." />

            <DTable
                data={subscriptions}
                columns={columns}
                title="Subscriptions"
                actions={(sub) => (
                    <TableActions>
                        <ActionButton onClick={() => setEditing(sub)}>Edit</ActionButton>
                        <ActionButton tone="danger" onClick={() => handleDelete(sub)}>Delete</ActionButton>
                    </TableActions>
                )}
            />

            {editing && (
                <EntityFormModal
                    title={`${editing.userName}'s subscription`}
                    onCancel={() => setEditing(null)}
                    onSubmit={submitEdit}
                    fields={[
                        { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTIONS },
                        { name: "planType", label: "Plan", type: "select", options: PLAN_OPTIONS },
                    ]}
                    initial={{
                        status: editing.status.toUpperCase(),
                        planType:
                            editing.plan === "Everyday Yoga" ? "EVERYDAY_YOGA" :
                                editing.plan === "Yoga Therapy" ? "YOGA_THERAPY" : "TRIAL",
                    }}
                />
            )}
        </div>
    );
}
