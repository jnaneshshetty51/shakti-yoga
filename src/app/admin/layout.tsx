"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import type { IconType } from "react-icons";
import {
    LuLayoutDashboard, LuChartLine, LuChartColumnBig, LuUsers, LuFlower2, LuTarget, LuGraduationCap,
    LuCreditCard, LuHeart, LuCalendarDays, LuCalendarClock, LuClock, LuMessageSquare,
    LuFileText, LuInbox, LuArchive, LuSettings, LuSearch, LuCircleHelp, LuMenu, LuX,
    LuChevronDown, LuLogOut, LuUserRound, LuClipboardList, LuUserPlus, LuGift, LuLifeBuoy,
    LuBuilding2, LuTent, LuAward, LuReceipt, LuMegaphone,
} from "react-icons/lu";
import { CommandPalette, useCommandPalette } from "@/components/admin/CommandPalette";
import { NotificationsBell } from "@/components/admin/NotificationsBell";
import { ToastProvider } from "@/components/admin/Toast";
import { Menu, MenuItem, MenuLabel, MenuSep } from "@/components/admin/ui";

type Department = "CONTENT" | "SUPPORT" | "TRAINER" | "THERAPIST";
type NavItem = { name: string; href: string; icon: IconType; superOnly?: boolean; departments?: Department[] };
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
    {
        label: "Overview",
        items: [
            { name: "Dashboard", href: "/admin", icon: LuLayoutDashboard },
            { name: "Analytics", href: "/admin/analytics", icon: LuChartLine },
            { name: "Reports", href: "/admin/reports", icon: LuChartColumnBig },
            { name: "Retention", href: "/admin/retention", icon: LuTarget },
        ],
    },
    {
        label: "People",
        items: [
            { name: "Users", href: "/admin/users", icon: LuUsers },
            { name: "Members", href: "/admin/members", icon: LuFlower2 },
            { name: "Leads", href: "/admin/leads", icon: LuTarget },
            { name: "Staff", href: "/admin/staff", icon: LuGraduationCap },
            { name: "Family", href: "/admin/family", icon: LuUserPlus },
            { name: "Referrals", href: "/admin/referrals", icon: LuGift },
        ],
    },
    {
        label: "Operations",
        items: [
            { name: "Subscriptions", href: "/admin/subscriptions", icon: LuCreditCard },
            { name: "Payments", href: "/admin/payments", icon: LuReceipt },
            { name: "Invoices", href: "/admin/invoices", icon: LuFileText },
            { name: "Classes", href: "/admin/classes", icon: LuHeart, departments: ["TRAINER"] },
            { name: "Schedule", href: "/admin/schedule", icon: LuCalendarDays, departments: ["TRAINER"] },
            { name: "Bookings", href: "/admin/bookings", icon: LuCalendarClock, departments: ["THERAPIST"] },
            { name: "Availability", href: "/admin/availability", icon: LuClock, departments: ["TRAINER", "THERAPIST"] },
            { name: "Therapy Assessments", href: "/admin/therapy", icon: LuClipboardList, departments: ["THERAPIST"] },
            { name: "Patient updates", href: "/admin/therapy/updates", icon: LuClipboardList, departments: ["THERAPIST"] },
        ],
    },
    {
        label: "Business",
        items: [
            { name: "Corporate", href: "/admin/corporate", icon: LuBuilding2 },
            { name: "Retreats & Events", href: "/admin/retreats", icon: LuTent },
        ],
    },
    {
        label: "Content",
        items: [
            { name: "Content", href: "/admin/content", icon: LuFileText, departments: ["CONTENT"] },
            { name: "Practices", href: "/admin/practices", icon: LuFlower2, departments: ["CONTENT"] },
            { name: "Challenges", href: "/admin/challenges", icon: LuTarget, departments: ["CONTENT"] },
            { name: "Achievements", href: "/admin/achievements", icon: LuAward, departments: ["CONTENT"] },
            { name: "FAQ", href: "/admin/faqs", icon: LuCircleHelp, departments: ["CONTENT"] },
            { name: "Site content", href: "/admin/site-content", icon: LuFileText, departments: ["CONTENT"] },
            { name: "WhatsApp", href: "/admin/community", icon: LuMessageSquare, departments: ["CONTENT"] },
            { name: "Certificates", href: "/admin/certificates", icon: LuAward },
            { name: "Messages", href: "/admin/messages", icon: LuInbox },
            { name: "Broadcast", href: "/admin/broadcast", icon: LuMegaphone },
        ],
    },
    {
        label: "Support",
        items: [
            { name: "Support Inbox", href: "/admin/support", icon: LuLifeBuoy, departments: ["SUPPORT"] },
        ],
    },
    {
        label: "System",
        items: [
            { name: "Pricing", href: "/admin/pricing", icon: LuCreditCard, superOnly: true },
            { name: "Audit Log", href: "/admin/audit", icon: LuArchive, superOnly: true },
            { name: "Settings", href: "/admin/settings", icon: LuSettings, superOnly: true },
        ],
    },
];

function Avatar({ url, name }: { url?: string | null; name?: string | null }) {
    return (
        <div className="w-9 h-9 bg-brand/15 rounded-full flex items-center justify-center text-brand font-semibold text-xs overflow-hidden shrink-0">
            {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="w-full h-full object-cover" />
            ) : (
                name?.charAt(0) || "A"
            )}
        </div>
    );
}

function NavList({
    groups,
    pathname,
    onNavigate,
}: {
    groups: NavGroup[];
    pathname: string;
    onNavigate?: () => void;
}) {
    return (
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
            {groups.map((group) => (
                <div key={group.label} className="mb-3 last:mb-1">
                    <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
                        {group.label}
                    </div>
                    <div className="space-y-0.5">
                        {group.items.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onNavigate}
                                    className={`relative flex items-center gap-3 px-3 py-1.5 rounded-control text-sm font-medium transition-colors ${
                                        isActive
                                            ? "bg-brand/10 text-brand"
                                            : "text-ink-muted hover:bg-surface-hover hover:text-ink"
                                    }`}
                                >
                                    {isActive && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-brand" />
                                    )}
                                    <Icon className={`text-base shrink-0 ${isActive ? "text-brand" : "text-ink-subtle"}`} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}

function UserMenu({
    url, name, tierLabel, onLogout,
}: { url?: string | null; name?: string | null; tierLabel: string; onLogout: () => void }) {
    return (
        <Menu
            trigger={
                <span className="flex items-center gap-1.5 pl-0.5 pr-1.5 py-0.5 rounded-full hover:bg-surface-hover transition-colors">
                    <Avatar url={url} name={name} />
                    <LuChevronDown className="w-4 h-4 text-ink-subtle" />
                </span>
            }
        >
            <MenuLabel>{name || "Admin"} · {tierLabel}</MenuLabel>
            <MenuItem href="/admin/settings" icon={LuSettings}>Settings</MenuItem>
            <MenuItem href="/admin/audit" icon={LuArchive}>Audit log</MenuItem>
            <MenuItem href="/dashboard" icon={LuUserRound}>My member view</MenuItem>
            <MenuSep />
            <MenuItem onClick={onLogout} icon={LuLogOut} tone="danger">Sign out</MenuItem>
        </Menu>
    );
}

function SidebarFooter({ url, name, tierLabel }: { url?: string | null; name?: string | null; tierLabel: string }) {
    return (
        <div className="p-3 border-t border-hairline">
            <div className="flex items-center gap-3 px-2 py-1.5">
                <Avatar url={url} name={name} />
                <div className="overflow-hidden">
                    <div className="text-sm font-semibold text-ink truncate">{name || "Admin"}</div>
                    <div className="text-xs text-ink-subtle truncate">{tierLabel}</div>
                </div>
            </div>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const cmd = useCommandPalette();

    const isSuper = user?.tier === "super";
    const department = user?.department ?? null;
    const DEPT_LABEL: Record<string, string> = {
        CONTENT: "Content Team", SUPPORT: "Support Staff", TRAINER: "Everyday Trainer", THERAPIST: "Yoga Therapist",
    };
    const tierLabel = department
        ? DEPT_LABEL[department] ?? "Staff"
        : user?.tier === "staff" ? "Staff Admin" : "Super Admin";
    // A departmented staff account (Content Team / Support Staff) sees ONLY its
    // own department's items — this is their whole admin experience, not a
    // filtered version of the full one. A full admin (no department) sees
    // everything except superOnly items, as before.
    const groups = NAV
        .map((g) => ({
            ...g,
            items: g.items.filter((i) =>
                department ? i.departments?.includes(department) : (!i.superOnly || isSuper)
            ),
        }))
        .filter((g) => g.items.length > 0);

    return (
        <ToastProvider>
            <div data-app-shell className="min-h-screen flex">
                {/* Desktop sidebar */}
                <aside className="w-64 bg-surface border-r border-hairline hidden lg:flex flex-col fixed h-full z-10">
                    <div className="px-5 pt-5 pb-3">
                        <Link href="/" className="text-xl font-semibold text-brand tracking-tight">
                            Shakti<span className="text-secondary">.</span>
                        </Link>
                        <button
                            onClick={() => cmd.setIsOpen(true)}
                            className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-control border border-hairline text-xs text-ink-subtle hover:border-brand/30 hover:text-ink-muted transition-colors"
                        >
                            <LuSearch className="text-sm" />
                            <span className="flex-1 text-left">Quick search…</span>
                            <kbd className="px-1.5 py-0.5 bg-black/[0.05] rounded text-[10px]">⌘K</kbd>
                        </button>
                    </div>

                    <NavList groups={groups} pathname={pathname} />
                    <SidebarFooter url={user?.avatarUrl} name={user?.name} tierLabel={tierLabel} />
                </aside>

                {/* Mobile drawer */}
                {isMenuOpen && (
                    <div className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={() => setIsMenuOpen(false)} />
                )}
                <aside
                    className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-surface border-r border-hairline z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
                >
                    <div className="px-5 pt-5 pb-3 flex items-start justify-between">
                        <Link href="/" className="text-xl font-semibold text-brand tracking-tight" onClick={() => setIsMenuOpen(false)}>
                            Shakti<span className="text-secondary">.</span>
                        </Link>
                        <button onClick={() => setIsMenuOpen(false)} className="p-2 -mr-2 hover:bg-surface-hover rounded-control" aria-label="Close menu">
                            <LuX className="w-5 h-5 text-ink-muted" />
                        </button>
                    </div>
                    <NavList groups={groups} pathname={pathname} onNavigate={() => setIsMenuOpen(false)} />
                    <SidebarFooter url={user?.avatarUrl} name={user?.name} tierLabel={tierLabel} />
                </aside>

                {/* Main */}
                <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
                    <header className="sticky top-0 z-30 bg-surface-sunken/85 backdrop-blur-md border-b border-hairline">
                        <div className="flex items-center gap-2 sm:gap-3 px-4 lg:px-8 h-16">
                            <button
                                className="lg:hidden p-2 -ml-2 shrink-0 text-ink-muted hover:bg-surface-hover rounded-control"
                                onClick={() => setIsMenuOpen(true)}
                                aria-label="Open menu"
                            >
                                <LuMenu className="w-6 h-6" />
                            </button>
                            <button
                                onClick={() => cmd.setIsOpen(true)}
                                className="min-w-0 flex-1 max-w-xl flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-surface border border-hairline text-sm text-ink-subtle hover:border-brand/30 transition-colors"
                            >
                                <LuSearch className="text-base shrink-0" />
                                <span className="flex-1 text-left truncate">
                                    <span className="sm:hidden">Search…</span>
                                    <span className="hidden sm:inline">Search members, leads, bookings…</span>
                                </span>
                                <kbd className="hidden sm:inline px-1.5 py-0.5 bg-black/[0.05] rounded text-[10px]">⌘K</kbd>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                                <NotificationsBell />
                                <a
                                    href="/contact"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hidden sm:flex p-2 text-ink-subtle hover:bg-surface-hover rounded-full transition-colors"
                                    aria-label="Help & support"
                                    title="Help & support"
                                >
                                    <LuCircleHelp className="w-5 h-5" />
                                </a>
                                <UserMenu url={user?.avatarUrl} name={user?.name} tierLabel={tierLabel} onLogout={() => logout()} />
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 p-4 lg:p-8">{children}</main>
                </div>

                <CommandPalette isOpen={cmd.isOpen} onClose={() => cmd.setIsOpen(false)} />
            </div>
        </ToastProvider>
    );
}
