"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { user, logout } = useAuth();

    const getRoleBadge = () => {
        switch (user?.role) {
            case 'member_therapy':
                return '1:1 Therapy Member';
            case 'member_everyday':
                return 'Everyday Yoga Member';
            case 'trial':
                return 'Trial Member';
            case 'admin':
                return 'Administrator';
            default:
                return 'Free Account';
        }
    };

    const getInitials = (name?: string) => {
        if (!name) return 'SY';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <>
            {/* Mobile Header Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-primary text-white z-40 px-4 flex items-center justify-between border-b border-white/10">
                <Link href="/dashboard" className="font-serif text-xl font-bold tracking-wider">
                    Shakti Yoga
                </Link>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-white focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Toggle Dashboard Menu"
                >
                    <div className="w-6 h-5 flex flex-col justify-between">
                        <span className={`w-full h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                        <span className={`w-full h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
                        <span className={`w-full h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2.5' : ''}`}></span>
                    </div>
                </button>
            </div>

            {/* Mobile Drawer Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar (Desktop fixed + Mobile Drawer) */}
            <aside className={`w-64 bg-primary text-white h-screen fixed left-0 top-0 flex-col z-50 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'flex translate-x-0' : 'hidden lg:flex -translate-x-full lg:translate-x-0'}`}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <Link href="/" className="font-serif text-2xl font-bold tracking-wider">
                        Shakti Yoga
                    </Link>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden text-white/70 hover:text-white text-xl p-1"
                    >
                        ✕
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <Link
                        href="/dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-3 rounded hover:bg-white/10 transition-colors font-sans text-sm uppercase tracking-widest"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/dashboard/classes"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-3 rounded hover:bg-white/10 transition-colors font-sans text-sm uppercase tracking-widest"
                    >
                        My Classes
                    </Link>
                    <Link
                        href="/dashboard/billing"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-3 rounded hover:bg-white/10 transition-colors font-sans text-sm uppercase tracking-widest"
                    >
                        Plan & Billing
                    </Link>
                    <Link
                        href="/dashboard/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-3 rounded hover:bg-white/10 transition-colors font-sans text-sm uppercase tracking-widest"
                    >
                        Profile
                    </Link>
                    <a
                        href="mailto:support@shaktiyoga.com?subject=Support Request&body=Hi, I need help with..."
                        className="block px-4 py-3 rounded hover:bg-white/10 transition-colors font-sans text-sm uppercase tracking-widest opacity-70"
                    >
                        Support
                    </a>
                </nav>

                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center font-bold text-xs overflow-hidden">
                            {user?.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                getInitials(user?.name)
                            )}
                        </div>
                        <div className="text-sm truncate">
                            <div className="font-bold truncate">{user?.name || 'Guest User'}</div>
                            <div className="text-[10px] uppercase font-bold text-secondary tracking-wide">{getRoleBadge()}</div>
                        </div>
                    </div>
                    {user?.role === 'visitor' && (
                        <Link
                            href="/programs"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block my-2 py-2 px-3 bg-secondary text-white text-center font-bold text-xs uppercase tracking-widest rounded hover:bg-white hover:text-primary transition-colors"
                        >
                            Upgrade Plan
                        </Link>
                    )}
                    <button
                        onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                        className="w-full mt-2 text-xs text-center opacity-70 hover:opacity-100 uppercase tracking-widest py-2 hover:bg-white/10 rounded transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
}
