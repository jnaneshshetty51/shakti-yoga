"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, PageLoading, Tabs } from "@/components/admin/ui";
import { AdminMembersContent } from "@/app/admin/members/page";
import { AdminUsersContent } from "@/app/admin/users/page";
import { AdminFamilyContent } from "@/app/admin/family/page";
import { AdminChallengesContent } from "@/app/admin/challenges/page";
import { AdminAchievementsContent } from "@/app/admin/achievements/page";
import { AdminCertificatesContent } from "@/app/admin/certificates/page";

type TabKey = "members" | "users" | "family" | "challenges" | "achievements" | "certificates";

const TABS: { key: TabKey; label: string }[] = [
    { key: "members", label: "Members" },
    { key: "users", label: "All Users" },
    { key: "family", label: "Family" },
    { key: "challenges", label: "Challenges" },
    { key: "achievements", label: "Achievements" },
    { key: "certificates", label: "Certificates" },
];

/**
 * The Student 360 hub — Members (active, by track), the full account list,
 * Family plans, gamification (Challenges/Achievements), and Certificates,
 * all in one place. A member's row links to /admin/members/[id] for the
 * actual 360 detail view (membership, credits, payments, attendance,
 * bookings, referrals, certificates, support history).
 */
function StudentsHub() {
    const tabParam = useSearchParams().get("tab") as TabKey | null;
    const [tab, setTab] = useState<TabKey>(tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : "members");

    return (
        <div>
            <PageHeader title="Students" subtitle="The central student database — members, accounts, family plans, progress, and certificates." />

            <div className="mb-6">
                <Tabs active={tab} onChange={(k) => setTab(k as TabKey)} tabs={TABS} />
            </div>

            {tab === "members" && <AdminMembersContent embedded />}
            {tab === "users" && <AdminUsersContent embedded />}
            {tab === "family" && <AdminFamilyContent embedded />}
            {tab === "challenges" && <AdminChallengesContent embedded />}
            {tab === "achievements" && <AdminAchievementsContent embedded />}
            {tab === "certificates" && <AdminCertificatesContent embedded />}
        </div>
    );
}

export default function AdminStudentsPage() {
    return (
        <Suspense fallback={<PageLoading title="Students" />}>
            <StudentsHub />
        </Suspense>
    );
}
