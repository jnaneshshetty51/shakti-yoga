"use client";

import { useCallback, useEffect, useState } from "react";
import { LuGift, LuUsers, LuTrendingUp, LuBadgeCheck } from "react-icons/lu";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";
import { PageHeader, PageLoading, StatusBadge, TableActions, ActionButton } from "@/components/admin/ui";
import { StatCard } from "@/components/admin/StatCard";

type Referral = {
    id: string;
    referrerName: string;
    referrerEmail: string;
    refereeName: string;
    refereeEmail: string;
    status: string;
    rewardMonths: number;
    convertedAt: string | null;
    rewardedAt: string | null;
    createdAt: string;
};

type Stats = {
    total: number;
    converted: number;
    conversionRate: number;
    creditsIssued: number;
};

export default function AdminReferralsPage() {
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Referral | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/referrals");
            if (res.ok) {
                const data = await res.json();
                setReferrals(data.referrals || []);
                setStats(data.stats || null);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const submitEdit = async (values: EntityValues) => {
        const res = await fetch(`/api/admin/referrals/${editing?.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rewardMonths: Number(values.rewardMonths) }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Update failed");
        }
        setEditing(null);
        load();
    };

    if (loading) return <PageLoading title="Referrals" />;

    const columns = [
        { header: "Referrer", accessor: (r: Referral) => (
            <div><div className="font-semibold text-ink">{r.referrerName}</div><div className="text-xs text-ink-subtle">{r.referrerEmail}</div></div>
        ) },
        { header: "Referee", accessor: (r: Referral) => (
            <div><div className="font-medium text-ink">{r.refereeName}</div><div className="text-xs text-ink-subtle">{r.refereeEmail}</div></div>
        ) },
        { header: "Status", accessor: (r: Referral) => <StatusBadge status={r.status} /> },
        { header: "Reward", accessor: (r: Referral) => `${r.rewardMonths} mo${r.rewardMonths === 1 ? "" : "s"}` },
        { header: "Rewarded", accessor: (r: Referral) => r.rewardedAt ? new Date(r.rewardedAt).toLocaleDateString("en-IN") : "—" },
    ];

    return (
        <div>
            <PageHeader title="Referrals" subtitle="Review Refer & Earn activity and adjust reward months." />

            {stats && (
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                    <StatCard title="Total referrals" value={stats.total} icon={<LuUsers />} accent="blue" />
                    <StatCard title="Converted" value={stats.converted} icon={<LuBadgeCheck />} accent="green" />
                    <StatCard title="Conversion rate" value={stats.conversionRate} suffix="%" icon={<LuTrendingUp />} accent="terracotta" />
                    <StatCard title="Credit months issued" value={stats.creditsIssued} icon={<LuGift />} accent="amber" />
                </div>
            )}

            <DTable
                data={referrals}
                columns={columns}
                title="Referrals"
                filters={[{ key: "status", label: "Status", options: [
                    { label: "Signed up", value: "signed_up" },
                    { label: "Converted", value: "converted" },
                ] }]}
                actions={(r) => (
                    <TableActions>
                        <ActionButton onClick={() => setEditing(r)}>Edit reward</ActionButton>
                    </TableActions>
                )}
            />

            {editing && (
                <EntityFormModal
                    title={`${editing.referrerName}'s reward`}
                    onCancel={() => setEditing(null)}
                    onSubmit={submitEdit}
                    fields={[{ name: "rewardMonths", label: "Reward months", type: "number", required: true }]}
                    initial={{ rewardMonths: editing.rewardMonths }}
                />
            )}
        </div>
    );
}
