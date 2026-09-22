"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader, PageLoading, Tabs, Badge } from "@/components/admin/ui";
import { AdminLeadsContent } from "@/app/admin/leads/page";
import { AdminCorporateContent } from "@/app/admin/corporate/page";
import { AdminRetreatsContent } from "@/app/admin/retreats/page";
import { AdminReferralsContent } from "@/app/admin/referrals/page";
import { LuUsers, LuBuilding, LuCompass, LuGift } from "react-icons/lu";

type TabKey = "leads" | "corporate" | "retreats" | "referrals";

const TABS: { key: TabKey; label: string }[] = [
    { key: "leads", label: "Leads" },
    { key: "corporate", label: "Corporate" },
    { key: "retreats", label: "Retreats & Events" },
    { key: "referrals", label: "Referrals" },
];

type CrmPulse = {
    leads: {
        total: number;
        new: number;
        contacted: number;
        trial: number;
        converted: number;
        lost: number;
        overdueFollowUps: number;
        thisMonth: number;
        conversionRate: number;
    };
    corporate: {
        totalDeals: number;
        activeDeals: number;
        pipelineValue: number;
        wonValue: number;
        inProposal: number;
    };
    retreats: {
        totalEnquiries: number;
        newEnquiries: number;
        confirmedParticipants: number;
        upcomingEvents: number;
    };
    referrals: {
        total: number;
        successful: number;
        pending: number;
        rewardedAmount: number;
    };
};

function formatCurrency(val: number) {
    if (val >= 100000) {
        return `₹${(val / 100000).toFixed(1)}L`;
    }
    if (val >= 1000) {
        return `₹${(val / 1000).toFixed(0)}k`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
}

/**
 * Everyone before and around conversion — website/trial leads, corporate
 * wellness deals, retreat & workshop enquiries, and refer-and-earn activity.
 * Includes executive CRM pulse indicators and streamlined sub-pipelines.
 */
function CrmHub() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab") as TabKey | null;
    const tab = tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : "leads";

    const [pulse, setPulse] = useState<CrmPulse | null>(null);

    useEffect(() => {
        let active = true;
        fetch("/api/admin/crm/overview")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (active && data) setPulse(data);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    const handleTabChange = (k: string) => {
        router.replace(`/admin/crm?tab=${k}`, { scroll: false });
    };

    return (
        <div>
            <PageHeader
                title="CRM Command Center"
                subtitle="End-to-end prospective student journey, B2B corporate contracts, retreat registrations, and word-of-mouth referrals."
            />

            {/* Executive CRM Pulse Overview */}
            {pulse && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {/* Leads Pulse */}
                    <button
                        type="button"
                        onClick={() => handleTabChange("leads")}
                        className={`text-left p-4 rounded-2xl border transition-all ${
                            tab === "leads"
                                ? "bg-surface ring-2 ring-brand/30 border-brand shadow-sm"
                                : "bg-surface border-hairline hover:border-brand/40"
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs text-ink-subtle mb-1">
                            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                <LuUsers className="w-3.5 h-3.5 text-brand" /> Leads Pipeline
                            </span>
                            {pulse.leads.overdueFollowUps > 0 && (
                                <Badge tone="amber" className="text-[10px] px-1.5 py-0">
                                    {pulse.leads.overdueFollowUps} due
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-ink">{pulse.leads.total}</span>
                            <span className="text-xs text-emerald-600 font-semibold">
                                {pulse.leads.conversionRate}% conv.
                            </span>
                        </div>
                        <div className="text-[11px] text-ink-subtle mt-1 flex items-center gap-2">
                            <span>{pulse.leads.trial} in trial</span>
                            <span>&bull;</span>
                            <span>{pulse.leads.thisMonth} this month</span>
                        </div>
                    </button>

                    {/* Corporate Pulse */}
                    <button
                        type="button"
                        onClick={() => handleTabChange("corporate")}
                        className={`text-left p-4 rounded-2xl border transition-all ${
                            tab === "corporate"
                                ? "bg-surface ring-2 ring-brand/30 border-brand shadow-sm"
                                : "bg-surface border-hairline hover:border-brand/40"
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs text-ink-subtle mb-1">
                            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                <LuBuilding className="w-3.5 h-3.5 text-blue-600" /> Corporate Deals
                            </span>
                            <span className="text-[10px] text-ink-subtle">{pulse.corporate.activeDeals} active</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-ink">
                                {formatCurrency(pulse.corporate.pipelineValue)}
                            </span>
                            <span className="text-xs text-ink-subtle">pipeline</span>
                        </div>
                        <div className="text-[11px] text-ink-subtle mt-1 flex items-center gap-2">
                            <span>{formatCurrency(pulse.corporate.wonValue)} closed</span>
                            <span>&bull;</span>
                            <span>{pulse.corporate.inProposal} in proposal</span>
                        </div>
                    </button>

                    {/* Retreats Pulse */}
                    <button
                        type="button"
                        onClick={() => handleTabChange("retreats")}
                        className={`text-left p-4 rounded-2xl border transition-all ${
                            tab === "retreats"
                                ? "bg-surface ring-2 ring-brand/30 border-brand shadow-sm"
                                : "bg-surface border-hairline hover:border-brand/40"
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs text-ink-subtle mb-1">
                            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                <LuCompass className="w-3.5 h-3.5 text-purple-600" /> Retreats & Events
                            </span>
                            {pulse.retreats.newEnquiries > 0 && (
                                <Badge tone="blue" className="text-[10px] px-1.5 py-0">
                                    {pulse.retreats.newEnquiries} new
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-ink">
                                {pulse.retreats.confirmedParticipants}
                            </span>
                            <span className="text-xs text-ink-subtle">seats confirmed</span>
                        </div>
                        <div className="text-[11px] text-ink-subtle mt-1 flex items-center gap-2">
                            <span>{pulse.retreats.totalEnquiries} enquiries</span>
                            <span>&bull;</span>
                            <span>{pulse.retreats.upcomingEvents} upcoming</span>
                        </div>
                    </button>

                    {/* Referrals Pulse */}
                    <button
                        type="button"
                        onClick={() => handleTabChange("referrals")}
                        className={`text-left p-4 rounded-2xl border transition-all ${
                            tab === "referrals"
                                ? "bg-surface ring-2 ring-brand/30 border-brand shadow-sm"
                                : "bg-surface border-hairline hover:border-brand/40"
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs text-ink-subtle mb-1">
                            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                <LuGift className="w-3.5 h-3.5 text-amber-600" /> Member Referrals
                            </span>
                            <span className="text-[10px] text-emerald-600 font-semibold">
                                {pulse.referrals.successful} converted
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-ink">
                                {formatCurrency(pulse.referrals.rewardedAmount)}
                            </span>
                            <span className="text-xs text-ink-subtle">rewarded</span>
                        </div>
                        <div className="text-[11px] text-ink-subtle mt-1 flex items-center gap-2">
                            <span>{pulse.referrals.pending} pending checkout</span>
                        </div>
                    </button>
                </div>
            )}

            <div className="mb-6">
                <Tabs active={tab} onChange={handleTabChange} tabs={TABS} />
            </div>

            {tab === "leads" && <AdminLeadsContent embedded />}
            {tab === "corporate" && <AdminCorporateContent embedded />}
            {tab === "retreats" && <AdminRetreatsContent embedded />}
            {tab === "referrals" && <AdminReferralsContent embedded />}
        </div>
    );
}

export default function AdminCrmPage() {
    return (
        <Suspense fallback={<PageLoading title="CRM" />}>
            <CrmHub />
        </Suspense>
    );
}
