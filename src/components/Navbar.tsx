"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { LuMenu, LuX, LuSparkles, LuPhoneCall, LuArrowRight, LuUserCheck, LuLogOut } from "react-icons/lu";

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user, logout, isLoading } = useAuth();
    const pathname = usePathname();
    const homeHref = user ? (user.role === "admin" ? "/admin" : "/dashboard") : null;

    // Prevent background scrolling when mobile/tablet menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isMenuOpen]);

    // Close menu on Escape key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsMenuOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname?.startsWith(href);
    };

    return (
        <nav className="flex justify-between items-center px-4 py-3.5 md:px-8 lg:px-12 xl:px-16 md:py-5 bg-background/95 backdrop-blur-md sticky top-0 z-40 border-b border-primary/10 transition-all">
            {/* Brand Logo */}
            <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className="group flex flex-col z-10"
            >
                <span className="font-serif text-2xl sm:text-3xl font-bold text-primary tracking-wider group-hover:text-secondary transition-colors">
                    Shakti Yoga
                </span>
                <span className="hidden sm:block text-[10px] font-sans uppercase tracking-[0.2em] text-text/60 -mt-1">
                    Authentic Lineage · Udupi, India
                </span>
            </Link>

            {/* Desktop Navigation Links (Visible on xl screens: >= 1280px) */}
            <div className="hidden xl:flex items-center gap-7 2xl:gap-8">
                {[
                    { label: "Home", href: "/" },
                    { label: "Everyday Yoga", href: "/everyday-yoga" },
                    { label: "Yoga Therapy", href: "/yoga-therapy" },
                    { label: "Pricing", href: "/programs" },
                    { label: "Teachers", href: "/teachers" },
                    { label: "About", href: "/about" },
                    { label: "Blog", href: "/blog" },
                ].map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`font-sans text-xs uppercase tracking-widest transition-colors py-1 relative ${
                                active
                                    ? "text-primary font-bold"
                                    : "text-text/80 hover:text-primary"
                            }`}
                        >
                            {item.label}
                            {active && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary rounded-full" />
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Desktop Auth & Action Buttons (Visible on xl screens: >= 1280px) */}
            <div className="hidden xl:flex items-center gap-5">
                {isLoading ? null : user ? (
                    <>
                        <Link
                            href={homeHref!}
                            className="font-sans text-xs font-bold text-primary hover:text-secondary transition-colors uppercase tracking-widest px-3 py-1.5 rounded-lg border border-primary/20 hover:border-primary/40 bg-primary/5"
                        >
                            {user.role === "admin" ? "Admin Portal" : "Dashboard"}
                        </Link>
                        <button
                            onClick={() => logout()}
                            className="font-sans text-xs font-semibold text-text/70 hover:text-primary transition-colors uppercase tracking-widest"
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link
                            href="/login"
                            className="font-sans text-xs font-bold text-text hover:text-primary transition-colors uppercase tracking-widest px-2"
                        >
                            Login
                        </Link>
                        <Link
                            href="/trial"
                            className="px-5 py-2.5 bg-secondary text-white font-sans text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-primary transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
                        >
                            Free Trial Class
                        </Link>
                    </>
                )}
            </div>

            {/* Tablet Menu Bar Controls (Visible on md & lg screens: 768px - 1279px) */}
            <div className="hidden md:flex xl:hidden items-center gap-3">
                {isLoading ? null : user ? (
                    <Link
                        href={homeHref!}
                        className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors border border-primary/15"
                    >
                        {user.role === "admin" ? "Admin" : "Dashboard"}
                    </Link>
                ) : (
                    <>
                        <Link
                            href="/login"
                            className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-text/80 hover:text-primary transition-colors"
                        >
                            Login
                        </Link>
                        <Link
                            href="/trial"
                            className="px-4 py-2 rounded-xl bg-secondary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary transition-colors shadow-sm"
                        >
                            Free Trial
                        </Link>
                    </>
                )}

                {/* Tablet Menu Trigger Button */}
                <button
                    onClick={() => setIsMenuOpen(true)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest transition-all duration-200 active:scale-95"
                    aria-label="Open navigation menu"
                >
                    <LuMenu className="w-4 h-4 text-primary" />
                    <span>Menu</span>
                </button>
            </div>

            {/* Mobile Bar Controls (Visible on screens < 768px) */}
            <div className="flex md:hidden items-center gap-2">
                {!user && (
                    <Link
                        href="/trial"
                        className="px-3 py-1.5 rounded-full bg-secondary text-white text-[11px] font-bold uppercase tracking-wider shadow-sm"
                    >
                        Free Trial
                    </Link>
                )}
                <button
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-primary rounded-lg active:bg-primary/10 transition-colors"
                    onClick={() => setIsMenuOpen(true)}
                    aria-label="Open menu"
                >
                    <LuMenu className="w-6 h-6" />
                </button>
            </div>

            {/* Responsive Tablet & Mobile Off-Canvas Drawer */}
            {/* Backdrop Blur Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
                    isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                onClick={() => setIsMenuOpen(false)}
            />

            {/* Slide-out Sheet (Full width on phone, 420px elegant right drawer on tablet) */}
            <div
                className={`fixed inset-y-0 right-0 w-full sm:max-w-md bg-[#FAF8F5] z-50 shadow-2xl border-l border-primary/15 flex flex-col p-6 sm:p-8 overflow-y-auto transform transition-transform duration-300 ease-out ${
                    isMenuOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
                }`}
                aria-modal="true"
                role="dialog"
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-5 border-b border-primary/10">
                    <div>
                        <span className="font-serif text-2xl font-bold text-primary tracking-wide block">
                            Shakti Yoga
                        </span>
                        <span className="text-[11px] font-sans uppercase tracking-widest text-text/60">
                            Sanctuary &amp; Living Sadhana
                        </span>
                    </div>
                    <button
                        onClick={() => setIsMenuOpen(false)}
                        className="w-10 h-10 rounded-full bg-primary/5 hover:bg-primary/10 text-primary flex items-center justify-center transition-colors"
                        aria-label="Close menu"
                    >
                        <LuX className="w-5 h-5" />
                    </button>
                </div>

                {/* Member Quick-Status / Guest CTA Bar */}
                <div className="my-5 p-4 rounded-2xl bg-white border border-primary/10 shadow-sm">
                    {isLoading ? null : user ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                                        {user.name ? user.name[0].toUpperCase() : "U"}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-text truncate max-w-[150px]">{user.name || "Member"}</p>
                                        <p className="text-[10px] text-secondary font-semibold uppercase tracking-wider">
                                            {user.role === "admin" ? "Admin" : user.role === "member_therapy" ? "1:1 Therapy" : "Member"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        logout();
                                    }}
                                    className="text-[11px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1 hover:underline"
                                >
                                    <LuLogOut className="text-xs" /> Logout
                                </button>
                            </div>
                            <Link
                                href={homeHref!}
                                onClick={() => setIsMenuOpen(false)}
                                className="block w-full py-2 text-center rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                Enter {user.role === "admin" ? "Admin Portal" : "My Dashboard"} →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-serif font-bold text-text">New to Shakti Yoga?</span>
                                <Link
                                    href="/login"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="text-xs font-bold text-primary uppercase tracking-wider hover:underline"
                                >
                                    Sign In →
                                </Link>
                            </div>
                            <Link
                                href="/trial"
                                onClick={() => setIsMenuOpen(false)}
                                className="block w-full py-3 text-center rounded-xl bg-secondary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary transition-colors shadow-sm"
                            >
                                Book Free Live Trial Class ✦
                            </Link>
                        </div>
                    )}
                </div>

                {/* Navigation Sections */}
                <div className="space-y-6 flex-1">
                    {/* Primary Practice Group */}
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary block mb-2 px-2">
                            Practices &amp; Healing
                        </span>
                        <div className="space-y-1">
                            {[
                                { label: "Home", href: "/", desc: "Sanctuary overview & live schedule" },
                                { label: "Everyday Yoga", href: "/everyday-yoga", desc: "Daily multi-timezone master batches" },
                                { label: "Yoga Therapy", href: "/yoga-therapy", desc: "1:1 clinical postural & healing protocols" },
                                { label: "Plans & Pricing", href: "/programs", desc: "Transparent INR, USD, EUR memberships" },
                                { label: "Teachers & Lineage", href: "/teachers", desc: "Certified Indian master practitioners" },
                            ].map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`block p-2.5 rounded-xl transition-colors ${
                                        isActive(item.href)
                                            ? "bg-primary/10 text-primary font-bold"
                                            : "hover:bg-primary/5 text-text"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-serif text-base">{item.label}</span>
                                        <LuArrowRight className="text-xs opacity-40" />
                                    </div>
                                    <p className="text-[11px] text-text/60 font-sans mt-0.5">{item.desc}</p>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Sanctuary & Community Group */}
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary block mb-2 px-2">
                            Community &amp; Wisdom
                        </span>
                        <div className="space-y-1">
                            {[
                                { label: "Workshops & Retreats", href: "/retreats", desc: "Udupi coastal retreats & intensive workshops" },
                                { label: "Corporate Wellness", href: "/corporate", desc: "Desk recovery & vitality for global teams" },
                                { label: "About Shakti Yoga", href: "/about", desc: "Ancient roots, philosophy, and Acharya Swastik" },
                                { label: "The Journal (Blog)", href: "/blog", desc: "Asana science, pranayama, and healing articles" },
                            ].map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`block p-2.5 rounded-xl transition-colors ${
                                        isActive(item.href)
                                            ? "bg-primary/10 text-primary font-bold"
                                            : "hover:bg-primary/5 text-text"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-serif text-base">{item.label}</span>
                                        <LuArrowRight className="text-xs opacity-40" />
                                    </div>
                                    <p className="text-[11px] text-text/60 font-sans mt-0.5">{item.desc}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Drawer Footer: WhatsApp Sangha & Contact */}
                <div className="pt-6 mt-6 border-t border-primary/10 space-y-3">
                    <a
                        href="https://wa.me/917760222478?text=Hello%20Shakti%20Yoga%20Kendra,%20I%20would%20like%20to%20know%20more%20about%20your%20classes."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-bold uppercase tracking-widest transition-all shadow-md active:scale-95"
                    >
                        <LuPhoneCall className="text-sm" />
                        <span>Chat on WhatsApp Sangha</span>
                    </a>
                    <p className="text-center text-[10px] text-text/50 font-sans">
                        Live Broadcast from Udupi, Karnataka, India · All Rights Reserved
                    </p>
                </div>
            </div>
        </nav>
    );
}
