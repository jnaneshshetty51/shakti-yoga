import type { IconType } from "react-icons";
import {
    LuLayoutDashboard, LuChartLine, LuChartColumnBig, LuUsers, LuFlower2, LuTarget, LuGraduationCap,
    LuCreditCard, LuHeart, LuCalendarDays, LuCalendarClock, LuClock, LuMessageSquare,
    LuFileText, LuInbox, LuArchive, LuSettings, LuCircleHelp,
    LuUserPlus, LuGift, LuLifeBuoy,
    LuBuilding2, LuTent, LuAward, LuReceipt, LuMegaphone, LuLayoutTemplate,
    LuClipboardList,
} from "react-icons/lu";

/**
 * Single source of truth for the admin navigation — consumed by the sidebar
 * (src/app/admin/layout.tsx) and the command palette (CommandPalette.tsx) so
 * the two never drift out of sync on destinations or permission gating.
 */

export type Department = "CONTENT" | "SUPPORT" | "TRAINER" | "THERAPIST";
export type NavItem = { name: string; description?: string; href: string; icon: IconType; superOnly?: boolean; departments?: Department[] };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
    {
        label: "Overview",
        items: [
            { name: "Dashboard", description: "Overview & attention items", href: "/admin", icon: LuLayoutDashboard },
            { name: "Analytics", description: "Trends, revenue, funnel", href: "/admin/analytics", icon: LuChartLine },
            { name: "Reports & Exports", description: "Revenue, cohorts, CSV exports", href: "/admin/reports", icon: LuChartColumnBig },
            { name: "Retention", description: "At-risk & lapsed members", href: "/admin/retention", icon: LuTarget },
        ],
    },
    {
        label: "People & Growth",
        items: [
            { name: "Members", description: "Active members by track", href: "/admin/members", icon: LuFlower2 },
            { name: "Users", description: "All system accounts", href: "/admin/users", icon: LuUsers },
            { name: "Leads", description: "Prospects & trial requests", href: "/admin/leads", icon: LuTarget },
            { name: "Staff", description: "Teachers & admins", href: "/admin/staff", icon: LuGraduationCap },
            { name: "Family", description: "Family plans & seats", href: "/admin/family", icon: LuUserPlus },
            { name: "Referrals", description: "Refer & Earn activity", href: "/admin/referrals", icon: LuGift },
        ],
    },
    {
        label: "Operations",
        items: [
            { name: "Daily Schedule", description: "Class instances & Meet links", href: "/admin/schedule", icon: LuCalendarDays, departments: ["TRAINER"] },
            { name: "Class Batches", description: "Master group class batches", href: "/admin/classes", icon: LuHeart, departments: ["TRAINER"] },
            { name: "1:1 Bookings", description: "1:1 session bookings", href: "/admin/bookings", icon: LuCalendarClock, departments: ["THERAPIST"] },
            { name: "Teacher Availability", description: "Teacher availability windows", href: "/admin/availability", icon: LuClock, departments: ["TRAINER", "THERAPIST"] },
            { name: "Therapy & Patient Care", description: "Yoga therapy intake review & patient updates", href: "/admin/therapy", icon: LuClipboardList, departments: ["THERAPIST"] },
        ],
    },
    {
        label: "Billing & Revenue",
        items: [
            { name: "Subscriptions", description: "Plans & billing state", href: "/admin/subscriptions", icon: LuCreditCard },
            { name: "Payments Ledger", description: "Payment & renewal charge ledger", href: "/admin/payments", icon: LuReceipt },
            { name: "Invoices", description: "Tax invoices, PDF download", href: "/admin/invoices", icon: LuFileText },
        ],
    },
    {
        label: "Communications",
        items: [
            { name: "Support Inbox", description: "Member support threads", href: "/admin/support", icon: LuLifeBuoy, departments: ["SUPPORT"] },
            { name: "Contact Inquiries", description: "Website contact form submissions", href: "/admin/messages", icon: LuInbox },
            { name: "Push Broadcast", description: "Send a push notification to a segment", href: "/admin/broadcast", icon: LuMegaphone },
            { name: "WhatsApp Sangha", description: "Community group links & pinned messages", href: "/admin/community", icon: LuMessageSquare, departments: ["CONTENT"] },
        ],
    },
    {
        label: "Content & Programs",
        items: [
            { name: "Media & Feed", description: "Reels, reflections, blog, stories", href: "/admin/content", icon: LuFileText, departments: ["CONTENT"] },
            { name: "Guided Practices", description: "Audio & video guided practices", href: "/admin/practices", icon: LuFlower2, departments: ["CONTENT"] },
            { name: "Challenges", description: "Time-boxed member goals", href: "/admin/challenges", icon: LuTarget, departments: ["CONTENT"] },
            { name: "Achievements", description: "Badge earn rates + grant/revoke", href: "/admin/achievements", icon: LuAward, departments: ["CONTENT"] },
            { name: "FAQ Knowledge Base", description: "Website + app FAQs", href: "/admin/faqs", icon: LuCircleHelp, departments: ["CONTENT"] },
            { name: "Edit Pages (CMS)", description: "Edit About, Home, Corporate copy", href: "/admin/pages", icon: LuLayoutTemplate, departments: ["CONTENT"] },
            { name: "Site Content", description: "Why-us benefits + homepage stats", href: "/admin/site-content", icon: LuFileText, departments: ["CONTENT"] },
            { name: "Certificates", description: "Issue & approve certificates", href: "/admin/certificates", icon: LuAward },
        ],
    },
    {
        label: "Business",
        items: [
            { name: "Corporate Wellness", description: "B2B pipeline & proposals", href: "/admin/corporate", icon: LuBuilding2 },
            { name: "Retreats & Events", description: "Retreats, workshops, enquiries", href: "/admin/retreats", icon: LuTent },
        ],
    },
    {
        label: "System",
        items: [
            { name: "Pricing Plans", description: "Plan prices + features (super only)", href: "/admin/pricing", icon: LuCreditCard, superOnly: true },
            { name: "Audit Log", description: "Privileged actions (super only)", href: "/admin/audit", icon: LuArchive, superOnly: true },
            { name: "Settings", description: "Platform settings (super only)", href: "/admin/settings", icon: LuSettings, superOnly: true },
        ],
    },
];

/**
 * Same visibility rule the sidebar uses: a departmented staff account sees
 * only its own department's items; a full admin (no department) sees
 * everything except superOnly items unless they're a super admin.
 */
export function visibleNavGroups(department: Department | null, isSuper: boolean): NavGroup[] {
    return NAV
        .map((g) => ({
            ...g,
            items: g.items.filter((i) =>
                department ? i.departments?.includes(department) : (!i.superOnly || isSuper)
            ),
        }))
        .filter((g) => g.items.length > 0);
}
