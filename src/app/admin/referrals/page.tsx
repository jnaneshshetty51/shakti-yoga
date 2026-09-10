"use client";

import { useCallback, useEffect, useState } from "react";
import { LuGift, LuUsers, LuTrendingUp, LuBadgeCheck } from "react-icons/lu";
import DTable from "@/components/admin/DTable";
import { useToast } from "@/components/admin/Toast";
import { PageHeader, PageLoading, StatusBadge, Badge, Card, Button, TableActions, ActionButton, labelClass, inputClass } from "@/components/admin/ui";
import { StatCard } from "@/components/admin/StatCard";

type Status = "PENDING" | "SUCCESSFUL" | "EXPIRED" | "REVERSED";

type Referral = {
    id: string;
    referrerName: string;
    referrerEmail: string;
    refereeName: string;
    refereeEmail: string;
    status: Status;
    rewardAmount: number;
    refereeDiscountAmount: number;
    flagged: boolean;
    expiresAt: string;
    convertedAt: string | null;
    createdAt: string;
};

type Settings = { referrerReward: number; refereeDiscount: number; validityDays: number };
type Stats = { total: number; successful: number; conversionRate: number; creditsIssued: number };

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function AdminReferralsPage() {
    const { showToast } = useToast();
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [form, setForm] = useState<Settings>({ referrerReward: 500, refereeDiscount: 250, validityDays: 90 });
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/referrals");
            if (res.ok) {
                const data = await res.json();
                setReferrals(data.referrals || []);
                setStats(data.stats || null);
                setSettings(data.settings || null);
                if (data.settings) setForm(data.settings);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const saveSettings = async () => {
        setSavingSettings(true);
        try {
            const res = await fetch("/api/admin/referrals", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Save failed");
            setSettings(data.settings);
            showToast("success", "Referral settings saved");
        } catch (err) {
            showToast("error", err instanceof Error ? err.message : "Save failed");
        } finally {
            setSavingSettings(false);
        }
    };

    const act = async (r: Referral, action: "reverse" | "flag" | "unflag") => {
        if (action === "reverse" && !confirm(`Claw back ${inr(r.rewardAmount)} from ${r.referrerName}? This can't be undone.`)) return;
        try {
            const res = await fetch(`/api/admin/referrals/${r.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Action failed");
            showToast("success", action === "reverse" ? "Reward reversed" : action === "flag" ? "Flagged for review" : "Flag cleared");
            load();
        } catch (err) {
            showToast("error", err instanceof Error ? err.message : "Action failed");
        }
    };

    if (loading) return <PageLoading title="Referrals" />;

    const dirty = settings != null &&
        (form.referrerReward !== settings.referrerReward ||
            form.refereeDiscount !== settings.refereeDiscount ||
            form.validityDays !== settings.validityDays);

    const columns = [
        { header: "Referrer", accessor: (r: Referral) => (
            <div><div className="font-semibold text-ink">{r.referrerName}</div><div className="text-xs text-ink-subtle">{r.referrerEmail}</div></div>
        ) },
        { header: "Referee", accessor: (r: Referral) => (
            <div className="flex items-center gap-1.5">
                <div><div className="font-medium text-ink">{r.refereeName}</div><div className="text-xs text-ink-subtle">{r.refereeEmail}</div></div>
                {r.flagged && <Badge tone="red">Review</Badge>}
            </div>
        ) },
        { header: "Status", accessor: (r: Referral) => <StatusBadge status={r.status} /> },
        { header: "Referrer reward", accessor: (r: Referral) => r.status === "SUCCESSFUL" ? inr(r.rewardAmount) : "—" },
        { header: "Referee discount", accessor: (r: Referral) => r.refereeDiscountAmount > 0 ? inr(r.refereeDiscountAmount) : "—" },
    ];

    return (
        <div>
            <PageHeader title="Referrals" subtitle="Refer & Earn activity, reward settings and manual review." />

            {stats && (
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                    <StatCard title="Total referrals" value={stats.total} icon={<LuUsers />} accent="blue" />
                    <StatCard title="Successful" value={stats.successful} icon={<LuBadgeCheck />} accent="green" />
                    <StatCard title="Conversion rate" value={stats.conversionRate} suffix="%" icon={<LuTrendingUp />} accent="terracotta" />
                    <StatCard title="Credit issued" value={inr(stats.creditsIssued)} icon={<LuGift />} accent="amber" />
                </div>
            )}

            <Card padded className="mb-6">
                <h3 className="font-bold text-ink mb-3">Reward settings</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                        <label className={labelClass}>Referrer reward (₹)</label>
                        <input type="number" min={0} className={inputClass} value={form.referrerReward}
                            onChange={(e) => setForm({ ...form, referrerReward: Number(e.target.value) })} />
                    </div>
                    <div>
                        <label className={labelClass}>Referee discount (₹)</label>
                        <input type="number" min={0} className={inputClass} value={form.refereeDiscount}
                            onChange={(e) => setForm({ ...form, refereeDiscount: Number(e.target.value) })} />
                    </div>
                    <div>
                        <label className={labelClass}>Validity (days)</label>
                        <input type="number" min={1} className={inputClass} value={form.validityDays}
                            onChange={(e) => setForm({ ...form, validityDays: Number(e.target.value) })} />
                    </div>
                </div>
                <div className="mt-4">
                    <Button onClick={saveSettings} loading={savingSettings} disabled={!dirty}>Save settings</Button>
                </div>
                <p className="text-xs text-ink-subtle mt-2">
                    Applies to new referrals and payments going forward. Amounts already granted don&rsquo;t change.
                    Discounts/credit apply to INR checkouts only.
                </p>
            </Card>

            <DTable
                data={referrals}
                columns={columns}
                title="Referrals"
                filters={[{ key: "status", label: "Status", options: [
                    { label: "Pending", value: "PENDING" },
                    { label: "Successful", value: "SUCCESSFUL" },
                    { label: "Expired", value: "EXPIRED" },
                    { label: "Reversed", value: "REVERSED" },
                ] }]}
                actions={(r) => (
                    <TableActions>
                        <ActionButton onClick={() => act(r, r.flagged ? "unflag" : "flag")}>
                            {r.flagged ? "Clear flag" : "Flag"}
                        </ActionButton>
                        {r.status === "SUCCESSFUL" && (
                            <ActionButton tone="danger" onClick={() => act(r, "reverse")}>Reverse</ActionButton>
                        )}
                    </TableActions>
                )}
            />
        </div>
    );
}
