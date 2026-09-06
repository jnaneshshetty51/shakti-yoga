"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/components/admin/Toast";

const NAV = [
    { name: "Today", href: "/teacher", icon: "📅" },
    { name: "My Sessions", href: "/teacher/sessions", icon: "💬" },
    { name: "Availability", href: "/teacher/availability", icon: "🕐" },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);

    const nav = (
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${active ? "bg-primary/5 text-primary" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                    >
                        <span className="text-lg">{item.icon}</span>
                        {item.name}
                    </Link>
                );
            })}
        </nav>
    );

    const footer = (
        <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center text-secondary font-bold text-xs overflow-hidden">
                    {user?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        user?.name?.charAt(0) || "T"
                    )}
                </div>
                <div className="overflow-hidden">
                    <div className="text-sm font-bold text-gray-800 truncate">{user?.name || "Teacher"}</div>
                    <div className="text-xs text-gray-500 truncate">Teacher</div>
                </div>
            </div>
            <button
                onClick={() => logout()}
                className="w-full mt-1 text-xs text-center text-gray-400 hover:text-gray-700 uppercase tracking-widest py-2 hover:bg-gray-50 rounded transition-colors"
            >
                Sign Out
            </button>
        </div>
    );

    return (
        <ToastProvider>
        <div className="min-h-screen bg-gray-50 flex">
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
                onClick={() => setOpen(!open)}
                aria-label="Toggle menu"
            >
                <div className="w-6 h-5 flex flex-col justify-between">
                    <span className={`w-full h-0.5 bg-primary transition-all ${open ? "rotate-45 translate-y-2" : ""}`} />
                    <span className={`w-full h-0.5 bg-primary transition-all ${open ? "opacity-0" : ""}`} />
                    <span className={`w-full h-0.5 bg-primary transition-all ${open ? "-rotate-45 -translate-y-2.5" : ""}`} />
                </div>
            </button>

            {open && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />}

            <aside className="w-64 bg-white border-r border-gray-200 hidden lg:flex flex-col fixed h-full z-10">
                <div className="p-6 border-b border-gray-100">
                    <Link href="/" className="font-serif text-2xl text-primary font-bold">
                        Shakti<span className="text-secondary">.</span>
                    </Link>
                    <div className="mt-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Teacher</div>
                </div>
                {nav}
                {footer}
            </aside>

            <aside className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform flex flex-col ${open ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <Link href="/" className="font-serif text-2xl text-primary font-bold" onClick={() => setOpen(false)}>
                        Shakti<span className="text-secondary">.</span>
                    </Link>
                    <button onClick={() => setOpen(false)} aria-label="Close" className="p-2 text-gray-500">✕</button>
                </div>
                {nav}
                {footer}
            </aside>

            <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">{children}</main>
        </div>
        </ToastProvider>
    );
}
