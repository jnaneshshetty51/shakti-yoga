"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="flex justify-between items-center px-6 py-6 md:px-16 bg-background sticky top-0 z-50 border-b border-black/5">
            <Link href="/" className="font-serif text-2xl font-bold text-primary tracking-wider z-50 relative">
                Shakti Yoga
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex gap-10">
                <Link href="/" className="font-sans text-sm text-text hover:text-primary transition-colors uppercase tracking-widest">Home</Link>
                <Link href="/everyday-yoga" className="font-sans text-sm text-text hover:text-primary transition-colors uppercase tracking-widest">Everyday Yoga</Link>
                <Link href="/yoga-therapy" className="font-sans text-sm text-text hover:text-primary transition-colors uppercase tracking-widest">Yoga Therapy</Link>
                <Link href="/about" className="font-sans text-sm text-text hover:text-primary transition-colors uppercase tracking-widest">About</Link>
                <Link href="/blog" className="font-sans text-sm text-text hover:text-primary transition-colors uppercase tracking-widest">Blog</Link>
            </div>

            {/* Desktop Buttons */}
            <div className="hidden md:flex items-center gap-6">
                <Link href="/login" className="font-sans text-sm font-bold text-text hover:text-primary transition-colors uppercase tracking-widest">
                    Login
                </Link>
                <Link href="/trial" className="px-6 py-2 bg-secondary text-white font-sans text-sm font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors shadow-md">
                    Free Trial Class
                </Link>
            </div>

            {/* Mobile Hamburger Button */}
            <button
                className="md:hidden z-50 relative p-2"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
            >
                <div className="w-6 h-5 flex flex-col justify-between">
                    <span className={`w-full h-0.5 bg-primary transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                    <span className={`w-full h-0.5 bg-primary transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                    <span className={`w-full h-0.5 bg-primary transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2.5' : ''}`}></span>
                </div>
            </button>

            {/* Mobile Drawer */}
            <div className={`fixed inset-0 bg-background z-40 transition-transform duration-300 ease-in-out md:hidden flex flex-col pt-24 px-8 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col gap-6">
                    <Link href="/trial" onClick={() => setIsMenuOpen(false)} className="text-xl font-serif text-secondary font-bold">
                        Free Trial Class
                    </Link>
                    <Link href="/everyday-yoga" onClick={() => setIsMenuOpen(false)} className="text-xl font-serif text-text hover:text-primary transition-colors">
                        Everyday Yoga
                    </Link>
                    <Link href="/yoga-therapy" onClick={() => setIsMenuOpen(false)} className="text-xl font-serif text-text hover:text-primary transition-colors">
                        Yoga Therapy
                    </Link>
                    <Link href="/about" onClick={() => setIsMenuOpen(false)} className="text-xl font-serif text-text hover:text-primary transition-colors">
                        About
                    </Link>
                    <Link href="/blog" onClick={() => setIsMenuOpen(false)} className="text-xl font-serif text-text hover:text-primary transition-colors">
                        Blog
                    </Link>
                    <Link href="/login" onClick={() => setIsMenuOpen(false)} className="text-xl font-serif text-text hover:text-primary transition-colors">
                        Login
                    </Link>
                </div>

                <div className="mt-auto mb-8">
                    <a
                        href="https://wa.me/917204050478"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-4 bg-green-600 text-white font-bold uppercase tracking-widest rounded hover:bg-green-700 transition-colors"
                    >
                        <span>Chat on WhatsApp</span>
                    </a>
                </div>
            </div>
        </nav>
    );
}
