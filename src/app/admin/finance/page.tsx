"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, PageLoading, Tabs } from "@/components/admin/ui";
import { AdminSubscriptionsContent } from "@/app/admin/subscriptions/page";
import { AdminPaymentsContent } from "@/app/admin/payments/page";
import { AdminInvoicesContent } from "@/app/admin/invoices/page";

type TabKey = "subscriptions" | "payments" | "invoices";

const TABS: { key: TabKey; label: string }[] = [
    { key: "subscriptions", label: "Subscriptions" },
    { key: "payments", label: "Payments" },
    { key: "invoices", label: "Invoices" },
];

function FinanceHub() {
    const tabParam = useSearchParams().get("tab") as TabKey | null;
    const [tab, setTab] = useState<TabKey>(tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : "subscriptions");

    return (
        <div>
            <PageHeader title="Payments & Finance" subtitle="Billing state, the transaction ledger, and invoices — one financial module." />

            <div className="mb-6">
                <Tabs active={tab} onChange={(k) => setTab(k as TabKey)} tabs={TABS} />
            </div>

            {tab === "subscriptions" && <AdminSubscriptionsContent embedded />}
            {tab === "payments" && <AdminPaymentsContent embedded />}
            {tab === "invoices" && <AdminInvoicesContent embedded />}
        </div>
    );
}

export default function AdminFinancePage() {
    return (
        <Suspense fallback={<PageLoading title="Payments & Finance" />}>
            <FinanceHub />
        </Suspense>
    );
}
