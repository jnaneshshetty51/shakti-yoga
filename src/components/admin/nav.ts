import type { IconType } from "react-icons";
import {
    LuLayoutDashboard, LuFlower2, LuTarget, LuCreditCard,
    LuCalendarDays, LuClock, LuClipboardList, LuGraduationCap,
    LuFileText, LuChartLine, LuArchive, LuLifeBuoy, LuNewspaper,
} from "react-icons/lu";

/**
 * Single source of truth for the admin navigation — consumed by the sidebar
 * (src/app/admin/layout.tsx) and the command palette (CommandPalette.tsx) so
 * the two never drift out of sync on destinations or permission gating.
 *
 * Was frozen at 11 modules (Dashboard + 10 hubs) per the "Final Admin
 * Dashboard" scope decision — every admin screen lived inside one of these as
 * a tab, reached via `?tab=`, rather than as its own top-level nav item. On
 * 2026-09-17 the user explicitly asked for Blog to break that freeze as a
 * deliberate 12th top-level module with its own dedicated (WordPress-style)
 * editor, rather than living as a tab inside Content & Communication. Blog
 * posts are still `Content` rows of type ARTICLE under the hood — this is a
 * new admin surface over existing data, not a new model. Everything else
 * still belongs inside one of the original 11 — ask before adding a 13th.
 */

export type Department = "CONTENT" | "SUPPORT" | "TRAINER" | "THERAPIST";
export type NavItem = {
    name: string;
    description?: string;
    href: string;
    icon: IconType;
    superOnly?: boolean;
    departments?: Department[];
    /**
     * This item exists only so a departmented account has a working deep
     * link into a hub whose *default* tab their department can't open (e.g.
     * a trainer landing on Staff's account-roles tab). A full/super admin
     * already sees the hub itself, so hide the deep link from them to keep
     * their sidebar at exactly the 11 frozen modules.
     */
    deepLinkOnly?: boolean;
};
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
    {
        label: "Overview",
        items: [
            { name: "Dashboard", description: "Overview & attention items", href: "/admin", icon: LuLayoutDashboard },
        ],
    },
    {
        label: "Business",
        items: [
            { name: "Students", description: "Members, accounts, family plans, progress & certificates", href: "/admin/students", icon: LuFlower2 },
            { name: "CRM", description: "Leads, corporate, retreats & events, referrals", href: "/admin/crm", icon: LuTarget },
            { name: "Payments & Finance", description: "Subscriptions, payments, invoices", href: "/admin/finance", icon: LuCreditCard },
        ],
    },
    {
        label: "Operations",
        items: [
            { name: "Classes & Schedule", description: "Recurring batches & the daily operational calendar", href: "/admin/classes", icon: LuCalendarDays, departments: ["TRAINER"] },
            { name: "Attendance", description: "Today's check-ins & attendance corrections", href: "/admin/attendance", icon: LuClipboardList, departments: ["TRAINER"] },
            { name: "Yoga Therapy", description: "Intake assessments & 1:1 session bookings", href: "/admin/therapy", icon: LuClipboardList, departments: ["THERAPIST"] },
            { name: "Staff", description: "Accounts, roles & RBAC", href: "/admin/staff", icon: LuGraduationCap },
            { name: "Availability", description: "Your teaching / session availability windows", href: "/admin/staff?tab=availability", icon: LuClock, departments: ["TRAINER", "THERAPIST"], deepLinkOnly: true },
        ],
    },
    {
        label: "Engagement",
        items: [
            { name: "Blog", description: "Write and publish blog articles — a dedicated WordPress-style editor", href: "/admin/blog", icon: LuNewspaper, departments: ["CONTENT"] },
            { name: "Content & Communication", description: "Library, testimonials, community, inbox, broadcast, WhatsApp, FAQ, pages", href: "/admin/content", icon: LuFileText, departments: ["CONTENT"] },
            { name: "Support Inbox", description: "Member support conversations", href: "/admin/content?tab=support", icon: LuLifeBuoy, departments: ["SUPPORT"], deepLinkOnly: true },
            { name: "Progress & Achievements", description: "Challenges and badge grants", href: "/admin/students?tab=challenges", icon: LuTarget, departments: ["CONTENT"], deepLinkOnly: true },
        ],
    },
    {
        label: "Insights",
        items: [
            { name: "Analytics & Retention", description: "Live performance, reports & exports, at-risk segments", href: "/admin/analytics", icon: LuChartLine },
        ],
    },
    {
        label: "System",
        items: [
            { name: "Settings & Audit", description: "Platform settings, pricing, privileged-action audit log (super only)", href: "/admin/settings", icon: LuArchive, superOnly: true },
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
                department ? i.departments?.includes(department) : (!i.superOnly || isSuper) && !i.deepLinkOnly
            ),
        }))
        .filter((g) => g.items.length > 0);
}
