"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { IconType } from "react-icons";
import {
    LuCalendarDays, LuMessageSquare, LuClock, LuWallet, LuMenu, LuX, LuLogOut,
} from "react-icons/lu";
import { ToastProvider } from "@/components/admin/Toast";

type NavItem = { name: string; href: string; icon: IconType };

const NAV: NavItem[] = [
    { name: "Today", href: "/teacher", icon: LuCalendarDays },
    { name: "My Sessions", href: "/teacher/sessions", icon: LuMessageSquare },
    { name: "Availability", href: "/teacher/availability", icon: LuClock },
    { name: "Earnings & Roster", href: "/teacher/earnings", icon: LuWallet },
];

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
        </nav>
    );
}

function Footer({ name, avatarUrl, onLogout }: { name?: string; avatarUrl?: string | null; onLogout: () => void }) {
    return (
        <div className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-9 h-9 bg-primary/15 rounded-full flex items-center justify-center text-primary font-bold text-xs overflow-hidden shrink-0">
                    {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        name?.charAt(0) || "T"
                    )}
                </div>
                <div className="overflow-hidden">
                    <div className="text-sm font-bold text-gray-800 truncate">{name || "Teacher"}</div>
                    <div className="text-[11px] font-medium text-secondary truncate">Teacher</div>
                </div>
            </div>
            <button
                onClick={onLogout}
                className="w-full mt-1 flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 hover:text-gray-700 py-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
                <LuLogOut className="text-sm" /> Sign out
            </button>
        </div>
    );
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    return (
        <ToastProvider>
            <div className="min-h-screen bg-[#FBFAF7] flex">
                <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border-b border-gray-200/70 z-40 px-4 flex items-center justify-between">
                    <Link href="/teacher" className="font-serif text-xl text-primary font-bold">
                        Shakti<span className="text-secondary">.</span>
                    </Link>
                    <button onClick={() => setOpen(!open)} className="p-2 -mr-2 text-gray-600 rounded-lg hover:bg-gray-100" aria-label="Toggle menu">
                        {open ? <LuX className="w-6 h-6" /> : <LuMenu className="w-6 h-6" />}
                    </button>
                </div>

                {open && <div className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={close} />}

                <aside className="w-64 bg-white border-r border-gray-200/80 hidden lg:flex flex-col fixed h-full z-10">
                    <div className="px-5 pt-6 pb-4">
                        <Link href="/" className="font-serif text-2xl text-primary font-bold">
                            Shakti<span className="text-secondary">.</span>
                        </Link>
                        <div className="mt-0.5 text-[11px] font-medium text-gray-400 tracking-wide">Teacher</div>
                    </div>
                    <NavList pathname={pathname} onNavigate={close} />
                    <Footer name={user?.name} avatarUrl={user?.avatarUrl} onLogout={() => { close(); logout(); }} />
                </aside>

                <aside
                    className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 flex flex-col transform transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}
                >
                    <div className="px-5 pt-6 pb-4 flex items-center justify-between">
                        <Link href="/" className="font-serif text-2xl text-primary font-bold" onClick={close}>
                            Shakti<span className="text-secondary">.</span>
                        </Link>
                        <button onClick={close} aria-label="Close" className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                            <LuX className="w-5 h-5" />
                        </button>
                    </div>
                    <NavList pathname={pathname} onNavigate={close} />
                    <Footer name={user?.name} avatarUrl={user?.avatarUrl} onLogout={() => { close(); logout(); }} />
                </aside>

                <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-[4.5rem] lg:pt-8">{children}</main>
            </div>
        </ToastProvider>
    );
}
