"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader, PageLoading, Tabs } from "@/components/admin/ui";
import { AdminLeadsContent } from "@/app/admin/leads/page";
import { AdminCorporateContent } from "@/app/admin/corporate/page";
import { AdminRetreatsContent } from "@/app/admin/retreats/page";
import { AdminReferralsContent } from "@/app/admin/referrals/page";

type TabKey = "leads" | "corporate" | "retreats" | "referrals";

const TABS: { key: TabKey; label: string }[] = [
    { key: "leads", label: "Leads" },
    { key: "corporate", label: "Corporate" },
    { key: "retreats", label: "Retreats & Events" },
    { key: "referrals", label: "Referrals" },
];

/**
 * Everyone before and around conversion — website/trial leads, corporate
 * wellness deals, retreat & workshop enquiries, and refer-and-earn activity.
 * Each keeps its own native pipeline stages (they don't share one status
 * vocabulary today — a Corporate deal has 8 stages, a Lead has 5) rather than
 * forcing a lossy unified enum onto a live schema.
 */
function CrmHub() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab") as TabKey | null;
    const tab = tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : "leads";

    const handleTabChange = (k: string) => {
        router.replace(`/admin/crm?tab=${k}`, { scroll: false });
    };

    return (
        <div>
            <PageHeader title="CRM Pipeline" subtitle="Full prospect and conversion lifecycle — prospective yogis, corporate wellness contracts, retreat bookings, and member referrals." />

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
