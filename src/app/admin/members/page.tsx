"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuFlower2, LuHeart, LuMessageSquare, LuIndianRupee } from "react-icons/lu";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";
import { StatCard } from "@/components/admin/StatCard";
import { PageHeader, PageLoading, Tabs, Badge, TableActions, ActionButton } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

type Member = {
    id: string;
    name: string;
    email: string;
    phone: string;
    country: string;
    avatarUrl: string;
    role: string;
    planType: string | null;
    plan: string;
    amount: number;
    subStatus: string | null;
    status: string;
    live: boolean;
    credits: number;
    classesAttended: number;
    totalSessions: number;
    upcomingSessions: number;
    nextSession: string | null;
    renewal: string | null;
    joinedAt: string;
    lastLogin: string;
};

type Payload = {
    active: Member[];
    group: Member[];
    therapy: Member[];
    counts: { active: number; group: number; therapy: number; mrr: number };
};

type TabKey = "active" | "group" | "therapy";

const TABS: { key: TabKey; label: string; blurb: string }[] = [
    { key: "active", label: "All Active", blurb: "Everyone on a live membership or trial." },
    { key: "group", label: "Group Classes", blurb: "Members entitled to the daily group class (Everyday Yoga + Trial)." },
    { key: "therapy", label: "1:1 Therapy", blurb: "Members on the personal 1:1 track, or holding session credits." },
];

const inr = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

function Avatar({ member }: { member: Member }) {
    return (
        <span className="w-8 h-8 rounded-full bg-accent/30 overflow-hidden shrink-0 flex items-center justify-center text-secondary font-serif text-sm">
            {member.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
                member.name.charAt(0).toUpperCase()
            )}
        </span>
    );
}

function nameCell(member: Member) {
    return (
        <div className="flex items-center gap-3 min-w-0">
            <Avatar member={member} />
            <div className="min-w-0">
                <div className="font-bold text-gray-800 truncate">{member.name}</div>
                <div className="text-xs text-gray-500 truncate">{member.email}</div>
            </div>
        </div>
    );
}

function planBadge(member: Member) {
    const tone =
        member.planType === "YOGA_THERAPY" ? "purple"
            : member.planType === "EVERYDAY_YOGA" ? "green"
                : member.planType === "TRIAL" ? "blue"
                    : "gray";
    return <Badge tone={tone}>{member.plan}</Badge>;
}

function statusBadge(member: Member) {
    return <Badge tone={member.status === "Active" ? "green" : "gray"}>{member.status}</Badge>;
}

export default function AdminMembersPage() {
    const { showToast } = useToast();
    const [data, setData] = useState<Payload | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabKey>("active");
    const [creditFor, setCreditFor] = useState<Member | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/members");
            if (res.ok) setData(await res.json());
        } catch (error) {
            console.error("Failed to load members:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const adjustCredits = async (values: EntityValues) => {
        if (!creditFor) return;
        const res = await fetch(`/api/admin/members/${creditFor.id}/credits`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: values.type, delta: Number(values.delta), note: values.note }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Adjustment failed");
        setCreditFor(null);
        showToast("success", "Credits adjusted.");
        fetchData();
    };

    const rowActions = (member: Member) => (
        <TableActions>
            <Link href={`/admin/members/${member.id}`} className="text-xs font-semibold text-brand hover:text-brand-strong">View</Link>
            <ActionButton onClick={() => setCreditFor(member)}>Credits</ActionButton>
        </TableActions>
    );

    const columns = useMemo(() => {
        const name = { header: "Member", accessor: nameCell, className: "min-w-[220px]" };
        const plan = { header: "Plan", accessor: planBadge, sortable: false };
        const status = { header: "Status", accessor: statusBadge };
        const phone = {
            header: "Phone",
            accessor: (m: Member) => m.phone || <span className="text-gray-300">—</span>,
        };
        const renewal = {
            header: "Renews",
            accessor: (m: Member) => m.renewal || <span className="text-gray-300">—</span>,
        };
        const joined = { header: "Joined", accessor: "joinedAt" as const, sortable: true };

        if (tab === "group") {
            return [
                name,
                plan,
                { header: "Classes attended", accessor: "classesAttended" as const, sortable: true },
                phone,
                renewal,
                joined,
            ];
        }
        if (tab === "therapy") {
            return [
                name,
                plan,
                { header: "Credits", accessor: "credits" as const, sortable: true },
                {
                    header: "Upcoming",
                    accessor: (m: Member) =>
                        m.upcomingSessions > 0 ? (
                            <span className="font-bold text-gray-800">{m.upcomingSessions}</span>
                        ) : (
                            <span className="text-gray-300">0</span>
                        ),
                    sortable: true,
                },
                {
                    header: "Next session",
                    accessor: (m: Member) => m.nextSession || <span className="text-gray-300">—</span>,
                },
                { header: "Total booked", accessor: "totalSessions" as const, sortable: true },
                renewal,
            ];
        }
        return [name, plan, status, phone, renewal, { header: "Last login", accessor: "lastLogin" as const, sortable: true }];
    }, [tab]);

    const rows = data ? data[tab] : [];
    const activeTab = TABS.find((t) => t.key === tab)!;

    if (loading) return <PageLoading title="Members" />;

    return (
        <div>
            <PageHeader title="Members" subtitle="Active members by track — group classes and 1:1 therapy." />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <StatCard title="Active Members" value={data?.counts.active ?? 0} icon={<LuFlower2 />} accent="green" />
                <StatCard title="Group Class" value={data?.counts.group ?? 0} icon={<LuHeart />} accent="blue" />
                <StatCard title="1:1 Therapy" value={data?.counts.therapy ?? 0} icon={<LuMessageSquare />} accent="terracotta" />
                <StatCard title="MRR" value={inr(data?.counts.mrr ?? 0)} icon={<LuIndianRupee />} accent="amber" />
            </div>

            <div className="mb-3">
                <Tabs
                    active={tab}
                    onChange={(k) => setTab(k)}
                    tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: data?.[t.key].length ?? 0 }))}
                />
            </div>
            <p className="text-sm text-gray-500 mb-4">{activeTab.blurb}</p>

            <DTable
                key={tab}
                data={rows}
                columns={columns}
                title={activeTab.label}
                searchable
                actions={rowActions}
            />

            {creditFor && (
                <EntityFormModal
                    title={`Adjust credits — ${creditFor.name}`}
                    submitLabel="Apply"
                    onCancel={() => setCreditFor(null)}
                    onSubmit={adjustCredits}
                    fields={[
                        { name: "type", label: "Credit type", type: "select", required: true, options: [
                            { label: "Group-class session credits (capped plans)", value: "session" },
                            { label: "1:1 therapy credits", value: "therapy" },
                        ] },
                        { name: "delta", label: "Change (+ to add, − to remove)", type: "number", required: true },
                        { name: "note", label: "Reason (audit note)", type: "text" },
                    ]}
                    initial={{ type: "session" }}
                />
            )}
        </div>
    );
}
