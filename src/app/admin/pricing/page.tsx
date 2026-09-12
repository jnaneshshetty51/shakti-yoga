"use client";

import { useCallback, useEffect, useState } from "react";
import { SuperAdminGuard } from "@/components/admin/SuperAdminGuard";
import { PageHeader, PageLoading, Card, Button, Badge, inputClass, labelClass } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

type Plan = {
    key: string; name: string; tier: string; interval: string;
    role: string; credits: number; sessionsPerCycle: number | null; weeklyClassLimit: number | null;
    defaultInr: number; defaultUsd: number; defaultFeatures: string[];
    inr: number; usd: number; features: string[]; recommended: boolean; overridden: boolean;
};
type Draft = Record<string, { inr: string; usd: string; features: string; recommended: boolean }>;

export default function AdminPricingPage() {
    return <SuperAdminGuard><Inner /></SuperAdminGuard>;
}

function Inner() {
    const { showToast } = useToast();
    const [plans, setPlans] = useState<Plan[] | null>(null);
    const [draft, setDraft] = useState<Draft>({});
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        const res = await fetch("/api/admin/plans");
        if (!res.ok) return;
        const data = await res.json();
        setPlans(data.plans);
        const d: Draft = {};
        for (const p of data.plans as Plan[]) {
            d[p.key] = {
                inr: String(p.inr), usd: String(p.usd),
                features: p.features.join("\n"), recommended: p.recommended,
            };
        }
        setDraft(d);
    }, []);
    useEffect(() => { load(); }, [load]);

    const set = (key: string, patch: Partial<Draft[string]>) =>
        setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } }));

    const save = async () => {
        if (!plans) return;
        setSaving(true);
        // Only send fields that differ from the code default.
        const overrides: Record<string, unknown> = {};
        for (const p of plans) {
            const dr = draft[p.key];
            const o: Record<string, unknown> = {};
            if (Number(dr.inr) !== p.defaultInr) o.inr = Number(dr.inr);
            if (Number(dr.usd) !== p.defaultUsd) o.usd = Number(dr.usd);
            if (dr.features.trim() !== p.defaultFeatures.join("\n")) o.features = dr.features;
            if (dr.recommended) o.recommended = true;
            if (Object.keys(o).length) overrides[p.key] = o;
        }
        try {
            const res = await fetch("/api/admin/plans", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ overrides }),
            });
            if (!res.ok) throw new Error("Save failed");
            showToast("success", "Pricing saved — live on the next app / page load.");
            load();
        } catch {
            showToast("error", "Could not save pricing.");
        } finally {
            setSaving(false);
        }
    };

    if (!plans) return <PageLoading title="Pricing" />;

    return (
        <div>
            <PageHeader
                title="Pricing Plans"
                subtitle="Manage regional pricing (INR/USD), plan recommendations, and marketing features for each membership tier."
            >
                <Button loading={saving} onClick={save}>Save pricing</Button>
            </PageHeader>

            <div className="grid gap-4 lg:grid-cols-2">
                {plans.map((p) => {
                    const dr = draft[p.key];
                    if (!dr) return null;
                    return (
                        <Card key={p.key} padded>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <span className="font-semibold text-ink">{p.name}</span>
                                    <span className="text-xs text-ink-subtle ml-2">{p.interval}</span>
                                </div>
                                {p.overridden && <Badge tone="amber">customised</Badge>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Price ₹ (default {p.defaultInr})</label>
                                    <input className={inputClass} type="number" value={dr.inr}
                                        onChange={(e) => set(p.key, { inr: e.target.value })} />
                                </div>
                                <div>
                                    <label className={labelClass}>Price $ (default {p.defaultUsd})</label>
                                    <input className={inputClass} type="number" value={dr.usd}
                                        onChange={(e) => set(p.key, { usd: e.target.value })} />
                                </div>
                            </div>

                            <label className={`${labelClass} mt-3`}>Features (one per line)</label>
                            <textarea className={inputClass} rows={4} value={dr.features}
                                onChange={(e) => set(p.key, { features: e.target.value })} />

                            <label className="flex items-center gap-2 mt-3 text-sm">
                                <input type="checkbox" checked={dr.recommended}
                                    onChange={(e) => set(p.key, { recommended: e.target.checked })} />
                                Mark as recommended
                            </label>

                            <p className="text-xs text-ink-subtle mt-3">
                                {p.role.toLowerCase().replace(/_/g, " ")} · {p.credits} therapy credits
                                {p.sessionsPerCycle != null ? ` · ${p.sessionsPerCycle} sessions/cycle` : ""}
                                {p.weeklyClassLimit != null ? ` · ${p.weeklyClassLimit} classes/week` : ""}
                            </p>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
