"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { LuCheck, LuX, LuSparkles, LuCalendar, LuLayoutDashboard } from "react-icons/lu";

interface AlreadyMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberRole?: string;
}

export default function AlreadyMemberModal({ isOpen, onClose, memberRole }: AlreadyMemberModalProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.body.style.overflow = "hidden";
            window.addEventListener("keydown", handleKeyDown);
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const isAdmin = memberRole === "admin";
    const isTrial = memberRole === "trial";

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="already-member-title"
        >
            <div 
                className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-primary/10 overflow-hidden transform animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative botanical header background */}
                <div className="bg-primary/5 border-b border-primary/10 px-6 py-6 text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full text-text/50 hover:text-text hover:bg-black/5 transition-colors"
                        aria-label="Close modal"
                    >
                        <LuX className="w-5 h-5" />
                    </button>

                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <LuSparkles className="w-7 h-7" />
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-wider mb-1">
                        <LuCheck className="w-3.5 h-3.5" />
                        {isAdmin ? "Administrator" : isTrial ? "Active Trial Access" : "Active Member"}
                    </span>
                    <h2 id="already-member-title" className="font-serif text-2xl font-bold text-primary mt-2">
                        You Are Already a Member
                    </h2>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-8 space-y-4 text-center">
                    <p className="text-text/70 text-sm sm:text-base leading-relaxed">
                        {isAdmin
                            ? "You have full administrator access to all classes, teachers, and student rosters."
                            : isTrial
                            ? "You already have an active trial pass. Your complimentary session is waiting in your dashboard!"
                            : "Your active membership gives you complete access to our daily live Everyday Yoga classes and practice sanctuary. You don't need a trial pass!"}
                    </p>

                    <div className="pt-2 flex flex-col gap-3">
                        <Link
                            href={isAdmin ? "/admin" : "/dashboard"}
                            onClick={onClose}
                            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-primary text-white font-sans text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all shadow-md active:scale-95"
                        >
                            <LuLayoutDashboard className="w-4 h-4" />
                            <span>{isAdmin ? "Go to Admin Portal" : "Go to My Dashboard"}</span>
                        </Link>

                        <Link
                            href={isAdmin ? "/admin/schedule" : "/schedule"}
                            onClick={onClose}
                            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl border border-primary/20 bg-primary/5 text-primary font-sans text-xs font-bold uppercase tracking-widest hover:bg-primary/10 transition-colors"
                        >
                            <LuCalendar className="w-4 h-4" />
                            <span>View Live Class Schedule</span>
                        </Link>

                        <button
                            onClick={onClose}
                            className="text-xs text-text/50 hover:text-text pt-1 font-medium transition-colors"
                        >
                            Stay on this page
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
