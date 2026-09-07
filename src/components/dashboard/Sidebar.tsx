"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { IconType } from "react-icons";
import {
    LuLayoutDashboard, LuHeart, LuTrendingUp, LuBell, LuCreditCard, LuUser,
    LuLifeBuoy, LuMenu, LuX, LuLogOut, LuArrowUpRight,
} from "react-icons/lu";

type NavItem = { name: string; href: string; icon: IconType };

const NAV: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LuLayoutDashboard },
    { name: "My Classes", href: "/dashboard/classes", icon: LuHeart },
    { name: "Progress", href: "/dashboard/progress", icon: LuTrendingUp },
    { name: "Activity", href: "/dashboard/activity", icon: LuBell },
    { name: "Plan & Billing", href: "/dashboard/billing", icon: LuCreditCard },
    { name: "Profile", href: "/dashboard/profile", icon: LuUser },
];

const ROLE_BADGE: Record<string, string> = {
    member_therapy: "1:1 Therapy Member",
    member_everyday: "Everyday Yoga Member",
    trial: "Trial Member",
    admin: "Administrator",
    teacher: "Teacher",
};

function initials(name?: string) {
    if (!name) return "SY";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
    return (
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {NAV.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            active ? "bg-primary/10 text-primary" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                    >
                        {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />}
                        <Icon className={`text-lg shrink-0 ${active ? "text-primary" : "text-gray-400"}`} />
                        {item.name}
                    </Link>
                );
            })}
            <a
                href="mailto:support@shaktiyoga.com?subject=Support Request"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
                <LuLifeBuoy className="text-lg shrink-0" />
                Support
            </a>
        </nav>
    );
}

function SidebarFooter({
    name, avatarUrl, badge, isVisitor, onNavigate, onLogout,
}: {
    name?: string; avatarUrl?: string | null; badge: string;
    isVisitor: boolean; onNavigate: () => void; onLogout: () => void;
}) {
    return (
        <div className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-9 h-9 bg-primary/15 rounded-full flex items-center justify-center text-primary font-bold text-xs overflow-hidden shrink-0">
                    {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        initials(name)
                    )}
                </div>
                <div className="overflow-hidden">
                    <div className="text-sm font-bold text-gray-800 truncate">{name || "Guest"}</div>
                    <div className="text-[11px] font-medium text-secondary truncate">{badge}</div>
                </div>
            </div>
            {isVisitor && (
                <Link
                    href="/programs"
                    onClick={onNavigate}
                    className="mt-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                    Upgrade plan <LuArrowUpRight className="text-sm" />
                </Link>
            )}
            <button
                onClick={onLogout}
                className="w-full mt-1 flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 hover:text-gray-700 py-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
                <LuLogOut className="text-sm" /> Sign out
            </button>
        </div>
    );
}

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);

    const badge = ROLE_BADGE[user?.role ?? ""] ?? "Free Account";
    const close = () => setOpen(false);
    const footerProps = {
        name: user?.name,
        avatarUrl: user?.avatarUrl,
        badge,
        isVisitor: user?.role === "visitor",
        onNavigate: close,
        onLogout: () => { close(); logout(); },
    };

    return (
        <>
            {/* Mobile top bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border-b border-gray-200/70 z-40 px-4 flex items-center justify-between">
                <Link href="/dashboard" className="font-serif text-xl text-primary font-bold">
                    Shakti<span className="text-secondary">.</span>
                </Link>
                <button onClick={() => setOpen(!open)} className="p-2 -mr-2 text-gray-600 rounded-lg hover:bg-gray-100" aria-label="Toggle menu">
                    {open ? <LuX className="w-6 h-6" /> : <LuMenu className="w-6 h-6" />}
                </button>
            </div>

            {open && <div className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={close} />}

            {/* Desktop sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200/80 hidden lg:flex flex-col fixed h-full z-10">
                <div className="px-5 pt-6 pb-4">
                    <Link href="/" className="font-serif text-2xl text-primary font-bold">
                        Shakti<span className="text-secondary">.</span>
                    </Link>
                    <div className="mt-0.5 text-[11px] font-medium text-gray-400 tracking-wide">Move · Breathe · Belong</div>
                </div>
                <NavList pathname={pathname} onNavigate={close} />
                <SidebarFooter {...footerProps} />
            </aside>

            {/* Mobile drawer */}
            <aside
                className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 flex flex-col transform transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="px-5 pt-6 pb-4 flex items-center justify-between">
                    <Link href="/" className="font-serif text-2xl text-primary font-bold" onClick={close}>
                        Shakti<span className="text-secondary">.</span>
                    </Link>
                    <button onClick={close} aria-label="Close menu" className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                        <LuX className="w-5 h-5" />
                    </button>
                </div>
                <NavList pathname={pathname} onNavigate={close} />
                <SidebarFooter {...footerProps} />
            </aside>
        </>
    );
}
