"use client";

import { useEffect } from "react";

interface VideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoSrc?: string;
    title?: string;
}

export default function VideoModal({
    isOpen,
    onClose,
    videoSrc = "/videos/practice-preview.webm",
    title = "Experience Shakti Yoga Live Class",
}: VideoModalProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.body.style.overflow = "hidden";
            window.addEventListener("keydown", handleKeyDown);
        }
        return () => {
            document.body.style.overflow = "unset";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 transition-all animate-in fade-in duration-200"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div
                className="relative w-full max-w-4xl bg-stone-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-stone-950/60">
                    <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h3 className="font-serif text-sm sm:text-base font-semibold text-white tracking-wide">
                            {title}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                        aria-label="Close video modal"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Video Player */}
                <div className="relative aspect-video bg-black flex items-center justify-center">
                    <video
                        src={videoSrc}
                        controls
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain"
                    >
                        Your browser does not support HTML5 video.
                    </video>
                </div>

                {/* Footer bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-stone-950/70 border-t border-white/10 text-xs text-white/70">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-primary/40 text-emerald-300 font-semibold uppercase tracking-wider text-[10px]">
                            Live From India
                        </span>
                        <span>Daily batches at 6:00 AM & 6:00 PM IST</span>
                    </div>
                    <a
                        href="/trial"
                        className="px-4 py-1.5 rounded-full bg-secondary hover:bg-primary text-white font-bold uppercase tracking-widest text-[11px] transition-colors"
                    >
                        Start Free Trial →
                    </a>
                </div>
            </div>
        </div>
    );
}
