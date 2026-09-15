"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
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
    const tabParam = useSearchParams().get("tab") as TabKey | null;
    const [tab, setTab] = useState<TabKey>(tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : "leads");

    return (
        <div>
            <PageHeader title="CRM" subtitle="Everyone before and around conversion — leads, corporate, retreats, referrals." />

            <div className="mb-6">
                <Tabs active={tab} onChange={(k) => setTab(k as TabKey)} tabs={TABS} />
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
