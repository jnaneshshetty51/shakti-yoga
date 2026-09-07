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
} from "react-icons/lu";
import { CommandPalette, useCommandPalette } from "@/components/admin/CommandPalette";
import { NotificationsBell } from "@/components/admin/NotificationsBell";
import { ToastProvider } from "@/components/admin/Toast";

type NavItem = { name: string; href: string; icon: IconType; superOnly?: boolean };

const NAV: NavItem[] = [
    { name: "Dashboard", href: "/admin", icon: LuLayoutDashboard },
    { name: "Analytics", href: "/admin/analytics", icon: LuChartLine },
    { name: "Reports", href: "/admin/reports", icon: LuChartColumnBig },
    { name: "Users", href: "/admin/users", icon: LuUsers },
    { name: "Members", href: "/admin/members", icon: LuFlower2 },
    { name: "Leads", href: "/admin/leads", icon: LuTarget },
    { name: "Staff", href: "/admin/staff", icon: LuGraduationCap },
    { name: "Subscriptions", href: "/admin/subscriptions", icon: LuCreditCard },
    { name: "Classes", href: "/admin/classes", icon: LuHeart },
    { name: "Schedule", href: "/admin/schedule", icon: LuCalendarDays },
    { name: "Bookings", href: "/admin/bookings", icon: LuCalendarClock },
    { name: "Availability", href: "/admin/availability", icon: LuClock },
    { name: "Community", href: "/admin/community", icon: LuMessageSquare },
    { name: "Content", href: "/admin/content", icon: LuFileText },
    { name: "Messages", href: "/admin/messages", icon: LuInbox },
    { name: "Audit Log", href: "/admin/audit", icon: LuArchive, superOnly: true },
    { name: "Settings", href: "/admin/settings", icon: LuSettings, superOnly: true },
];

function Avatar({ url, name }: { url?: string | null; name?: string | null }) {
    return (
        <div className="w-9 h-9 bg-primary/15 rounded-full flex items-center justify-center text-primary font-bold text-xs overflow-hidden shrink-0">
            {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="w-full h-full object-cover" />
            ) : (
                name?.charAt(0) || "A"
            )}
        </div>
    );
}

function NavLinks({
    items,
    pathname,
    onNavigate,
}: {
    items: NavItem[];
    pathname: string;
    onNavigate?: () => void;
}) {
    return (
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive
                            ? "bg-primary/10 text-primary"
                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                            }`}
                    >
                        {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                        )}
                        <Icon className={`text-lg shrink-0 ${isActive ? "text-primary" : "text-gray-400"}`} />
                        {item.name}
                    </Link>
                );
            })}
        </nav>
    );
}

function UserChip({ url, name, tierLabel }: { url?: string | null; name?: string | null; tierLabel: string }) {
    return (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors">
            <Avatar url={url} name={name} />
            <div className="overflow-hidden">
                <div className="text-sm font-bold text-gray-800 truncate">{name || "Admin"}</div>
                <div className="text-xs text-gray-500 truncate">{tierLabel}</div>
            </div>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const cmd = useCommandPalette();

    const isSuper = user?.tier === "super";
    const tierLabel = user?.tier === "staff" ? "Staff Admin" : "Super Admin";
    const navItems = NAV.filter((item) => !item.superOnly || isSuper);

    return (
        <ToastProvider>
            <div className="min-h-screen bg-[#FBFAF7] flex">
                {/* Desktop sidebar */}
                <aside className="w-64 bg-white border-r border-gray-200/80 hidden lg:flex flex-col fixed h-full z-10">
                    <div className="px-5 pt-6 pb-4">
                        <Link href="/" className="font-serif text-2xl text-primary font-bold">
                            Shakti<span className="text-secondary">.</span>
                        </Link>
                        <div className="mt-0.5 text-[11px] font-medium text-gray-400 tracking-wide">
                            Move · Breathe · Belong
                        </div>
                        <button
                            onClick={() => cmd.setIsOpen(true)}
                            className="mt-4 w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-400 hover:border-primary/30 hover:text-gray-600 transition-colors"
                        >
                            <LuSearch className="text-sm" />
                            <span className="flex-1 text-left">Quick search…</span>
                            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">⌘K</kbd>
                        </button>
                    </div>

                    <NavLinks items={navItems} pathname={pathname} />

                    <div className="p-3 border-t border-gray-100">
                        <UserChip url={user?.avatarUrl} name={user?.name} tierLabel={tierLabel} />
                    </div>
                </aside>

                {/* Mobile drawer */}
                {isMenuOpen && (
                    <div className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={() => setIsMenuOpen(false)} />
                )}
                <aside
                    className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
                >
                    <div className="px-5 pt-6 pb-4 flex items-start justify-between">
                        <div>
                            <Link href="/" className="font-serif text-2xl text-primary font-bold" onClick={() => setIsMenuOpen(false)}>
                                Shakti<span className="text-secondary">.</span>
                            </Link>
                            <div className="mt-0.5 text-[11px] font-medium text-gray-400 tracking-wide">Move · Breathe · Belong</div>
                        </div>
                        <button onClick={() => setIsMenuOpen(false)} className="p-2 -mr-2 hover:bg-gray-100 rounded-lg" aria-label="Close menu">
                            <LuX className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                    <NavLinks items={navItems} pathname={pathname} onNavigate={() => setIsMenuOpen(false)} />
                    <div className="p-3 border-t border-gray-100">
                        <UserChip url={user?.avatarUrl} name={user?.name} tierLabel={tierLabel} />
                    </div>
                </aside>

                {/* Main */}
                <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
                    {/* Top bar */}
                    <header className="sticky top-0 z-30 bg-[#FBFAF7]/80 backdrop-blur-md border-b border-gray-200/60">
                        <div className="flex items-center gap-2 sm:gap-3 px-4 lg:px-8 h-16">
                            <button
                                className="lg:hidden p-2 -ml-2 shrink-0 text-gray-600 hover:bg-gray-100 rounded-lg"
                                onClick={() => setIsMenuOpen(true)}
                                aria-label="Open menu"
                            >
                                <LuMenu className="w-6 h-6" />
                            </button>
                            <button
                                onClick={() => cmd.setIsOpen(true)}
                                className="min-w-0 flex-1 max-w-xl flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-white border border-gray-200 text-sm text-gray-400 hover:border-primary/30 transition-colors"
                            >
                                <LuSearch className="text-base shrink-0" />
                                <span className="flex-1 text-left truncate">
                                    <span className="sm:hidden">Search…</span>
                                    <span className="hidden sm:inline">Search members, leads, bookings…</span>
                                </span>
                                <kbd className="hidden sm:inline px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">⌘K</kbd>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                                <NotificationsBell />
                                <a
                                    href="/contact"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hidden sm:flex p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                                    aria-label="Help & support"
                                    title="Help & support"
                                >
                                    <LuCircleHelp className="w-5 h-5" />
                                </a>
                                <div className="ml-0.5">
                                    <Avatar url={user?.avatarUrl} name={user?.name} />
                                </div>
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
