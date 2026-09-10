"use client";

import { useCallback, useEffect, useState } from "react";
import { LuUserPlus } from "react-icons/lu";
import { PageHeader, PageLoading, ErrorState, Card, EmptyState, StatusBadge, ActionButton } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

interface Member {
    id: string;
    userId: string;
    name: string;
    email: string;
    status: string;
    renewalDate: string;
}

interface Group {
    id: string;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    status: string;
    renewalDate: string;
    inviteCode: string | null;
    seatsUsed: number;
    seatsTotal: number;
    members: Member[];
}

function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminFamilyPage() {
    const { showToast } = useToast();
    const [groups, setGroups] = useState<Group[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/family");
            if (!res.ok) throw new Error(String(res.status));
            const data = await res.json();
            setGroups(data.groups || []);
            setError(null);
        } catch {
            setError("Could not load family plans.");
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const act = async (ownerId: string, action: "resetCode" | "cancel") => {
        if (action === "cancel" && !confirm("Cancel this family plan? All seats lose access at once.")) return;
        const res = await fetch("/api/admin/family", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ownerId, action }),
        });
        if (!res.ok) return showToast("error", (await res.json().catch(() => ({}))).error || "Failed");
        showToast("success", action === "resetCode" ? "New invite code generated." : "Family plan cancelled.");
        load();
    };

    const removeSeat = async (seatId: string, name: string) => {
        if (!confirm(`Remove ${name} from this family plan?`)) return;
        const res = await fetch(`/api/admin/family?seatId=${seatId}`, { method: "DELETE" });
        if (!res.ok) return showToast("error", "Could not remove the seat.");
        showToast("success", `${name} removed.`);
        load();
    };

    if (error) return <ErrorState message={error} onRetry={load} />;
    if (!groups) return <PageLoading title="Family" />;

    return (
        <div>
            <PageHeader
                title="Family"
                subtitle="Every family plan and its seats. Members manage their own group from the app; use these controls to intervene."
            />

            {groups.length === 0 ? (
                <Card><EmptyState icon={LuUserPlus} title="No family plans yet" hint="Family groups appear here once a member starts one." /></Card>
            ) : (
                <div className="grid gap-4">
                    {groups.map((g) => (
                        <Card key={g.id} padded>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <div className="font-semibold text-ink">{g.ownerName}</div>
                                    <div className="text-sm text-ink-muted">{g.ownerEmail}</div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                    <StatusBadge status={g.status} />
                                    <span className="text-ink-subtle">renews {fmt(g.renewalDate)}</span>
                                    <span className="text-ink-subtle">{g.seatsUsed}/{g.seatsTotal} seats</span>
                                    {g.inviteCode && <span className="font-mono text-xs text-ink-subtle">{g.inviteCode}</span>}
                                    <ActionButton onClick={() => act(g.ownerId, "resetCode")}>Reset code</ActionButton>
                                    {g.status !== "CANCELLED" && (
                                        <ActionButton tone="danger" onClick={() => act(g.ownerId, "cancel")}>Cancel plan</ActionButton>
                                    )}
                                </div>
                            </div>

                            {g.members.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-hairline divide-y divide-hairline">
                                    {g.members.map((m) => (
                                        <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                                            <div>
                                                <div className="font-medium text-ink">{m.name}</div>
                                                <div className="text-ink-subtle text-xs">{m.email}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <StatusBadge status={m.status} />
                                                <span className="text-ink-subtle text-xs">renews {fmt(m.renewalDate)}</span>
                                                <ActionButton tone="danger" onClick={() => removeSeat(m.id, m.name)}>Remove</ActionButton>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
