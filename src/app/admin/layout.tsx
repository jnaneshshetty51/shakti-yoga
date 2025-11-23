"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navItems = [
        { name: "Dashboard", href: "/admin", icon: "📊" },
        { name: "Users", href: "/admin/users", icon: "👥" },
        { name: "Subscriptions", href: "/admin/subscriptions", icon: "💳" },
        { name: "Classes", href: "/admin/classes", icon: "🧘‍♀️" },
        { name: "Bookings", href: "/admin/bookings", icon: "📅" },
        { name: "Community", href: "/admin/community", icon: "💬" },
        { name: "Content", href: "/admin/content", icon: "📝" },
        { name: "Settings", href: "/admin/settings", icon: "⚙️" },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile/Tablet Hamburger Button */}
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
            >
                <div className="w-6 h-5 flex flex-col justify-between">
                    <span className={`w-full h-0.5 bg-primary transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                    <span className={`w-full h-0.5 bg-primary transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                    <span className={`w-full h-0.5 bg-primary transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2.5' : ''}`}></span>
                </div>
            </button>

            {/* Mobile/Tablet Overlay */}
            {isMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Sidebar - Desktop (lg and above) */}
            <aside className={`w-64 bg-white border-r border-gray-200 hidden lg:flex flex-col fixed h-full z-10`}>
                <div className="p-6 border-b border-gray-100">
                    <Link href="/" className="font-serif text-2xl text-primary font-bold">
                        Shakti<span className="text-secondary">.</span>
                    </Link>
                    <div className="mt-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Admin Panel</div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? "bg-primary/5 text-primary"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 px-4 py-2">
                        <div className="w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center text-secondary font-bold text-xs">
                            {user?.name?.charAt(0) || 'A'}
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-sm font-bold text-gray-800 truncate">{user?.name || 'Admin'}</div>
                            <div className="text-xs text-gray-500 truncate">Super Admin</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile/Tablet Sidebar Drawer */}
            <aside className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="font-serif text-2xl text-primary font-bold" onClick={() => setIsMenuOpen(false)}>
                            Shakti<span className="text-secondary">.</span>
                        </Link>
                        <button
                            onClick={() => setIsMenuOpen(false)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                            aria-label="Close menu"
                        >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="mt-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Admin Panel</div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? "bg-primary/5 text-primary"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 px-4 py-2">
                        <div className="w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center text-secondary font-bold text-xs">
                            {user?.name?.charAt(0) || 'A'}
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-sm font-bold text-gray-800 truncate">{user?.name || 'Admin'}</div>
                            <div className="text-xs text-gray-500 truncate">Super Admin</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
                {children}
            </main>
        </div>
    );
}
