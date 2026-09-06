"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DTable from "@/components/admin/DTable";
import { StatCard } from "@/components/admin/StatCard";

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
        member.planType === "YOGA_THERAPY"
            ? "bg-purple-100 text-purple-800"
            : member.planType === "EVERYDAY_YOGA"
                ? "bg-emerald-100 text-emerald-800"
                : member.planType === "TRIAL"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-600";
    return <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${tone}`}>{member.plan}</span>;
}

function statusBadge(member: Member) {
    const tone = member.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500";
    return <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${tone}`}>{member.status}</span>;
}

const rowActions = (member: Member) => (
    <a
        href={`mailto:${member.email}`}
        className="text-primary hover:text-secondary text-xs font-bold uppercase tracking-wider"
    >
        Email
    </a>
);

export default function AdminMembersPage() {
    const [data, setData] = useState<Payload | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabKey>("active");

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

    return (
        <div>
            <div className="mb-8">
                <h1 className="font-serif text-3xl text-gray-800 mb-2">Members</h1>
                <p className="text-gray-500">Active members by track — group classes and 1:1 therapy.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <StatCard title="Active Members" value={loading ? "…" : data?.counts.active ?? 0} icon={<span>🪷</span>} />
                <StatCard title="Group Class" value={loading ? "…" : data?.counts.group ?? 0} icon={<span>🧘</span>} />
                <StatCard title="1:1 Therapy" value={loading ? "…" : data?.counts.therapy ?? 0} icon={<span>💬</span>} />
                <StatCard title="MRR" value={loading ? "…" : inr(data?.counts.mrr ?? 0)} icon={<span>💳</span>} />
            </div>

            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-4">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                            }`}
                    >
                        {t.label}
                        <span
                            className={`px-2 py-0.5 text-xs rounded-full ${tab === t.key ? "bg-primary/10 text-primary" : "bg-gray-200 text-gray-600"
                                }`}
                        >
                            {loading ? "…" : data?.[t.key].length ?? 0}
                        </span>
                    </button>
                ))}
            </div>
            <p className="text-sm text-gray-500 mb-4">{activeTab.blurb}</p>

            {loading ? (
                <div className="text-gray-500">Loading…</div>
            ) : (
                <DTable
                    key={tab}
                    data={rows}
                    columns={columns}
                    title={activeTab.label}
                    searchable
                    actions={rowActions}
                />
            )}
        </div>
    );
}
