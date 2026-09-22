"use client";

import { useEffect, useState } from "react";
import { FaWhatsapp, FaFacebook, FaLinkedin, FaTwitter } from "react-icons/fa";
import { LuShare2, LuLink, LuCheck } from "react-icons/lu";

interface ShareButtonsProps {
    title: string;
    url?: string;
    variant?: "compact" | "card" | "floating";
    className?: string;
}

export default function ShareButtons({
    title,
    url,
    variant = "card",
    className = "",
}: ShareButtonsProps) {
    const resolvedUrl = url
        ? url.startsWith("http")
            ? url
            : `https://shaktiyoga.in${url.startsWith("/") ? "" : "/"}${url}`
        : "";

    const [currentUrl, setCurrentUrl] = useState(resolvedUrl);
    const [copied, setCopied] = useState(false);
    const [canNativeShare, setCanNativeShare] = useState(false);

    useEffect(() => {
        if (!url && typeof window !== "undefined") {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- client URL synchronization
            setCurrentUrl(window.location.href);
        } else if (url && !url.startsWith("http") && typeof window !== "undefined") {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- client URL synchronization
            setCurrentUrl(`${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`);
        }
        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
            setCanNativeShare(true);
        }
    }, [url]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(currentUrl || window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2200);
        } catch (err) {
            console.error("Failed to copy link:", err);
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    text: title,
                    url: currentUrl || window.location.href,
                });
            } catch {
                // User dismissed or aborted sharing
            }
        }
    };

    const targetUrl = currentUrl || (typeof window !== "undefined" ? window.location.href : "https://shaktiyoga.in");
    const encodedUrl = encodeURIComponent(targetUrl);
    const encodedTitle = encodeURIComponent(title);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedTitle}%20-%20${encodedUrl}`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

    if (variant === "floating") {
        return (
            <div className={`fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col items-center gap-2 p-2.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-secondary/15 ${className}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary py-0.5">Share</span>
                {canNativeShare && (
                    <button
                        onClick={handleNativeShare}
                        className="p-2 rounded-xl text-gray-700 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                        title="Share"
                        aria-label="Share via device"
                    >
                        <LuShare2 className="w-4 h-4" />
                    </button>
                )}
                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-[#25D366] hover:bg-[#25D366]/15 transition-all duration-200"
                    title="Share on WhatsApp"
                    aria-label="Share on WhatsApp"
                >
                    <FaWhatsapp className="w-4 h-4" />
                </a>
                <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-gray-700 hover:bg-gray-100 hover:text-black transition-all duration-200"
                    title="Share on X (Twitter)"
                    aria-label="Share on X"
                >
                    <FaTwitter className="w-4 h-4" />
                </a>
                <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-[#0A66C2] hover:bg-[#0A66C2]/15 transition-all duration-200"
                    title="Share on LinkedIn"
                    aria-label="Share on LinkedIn"
                >
                    <FaLinkedin className="w-4 h-4" />
                </a>
                <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-[#1877F2] hover:bg-[#1877F2]/15 transition-all duration-200"
                    title="Share on Facebook"
                    aria-label="Share on Facebook"
                >
                    <FaFacebook className="w-4 h-4" />
                </a>
                <button
                    onClick={handleCopy}
                    className={`p-2 rounded-xl transition-all duration-200 ${
                        copied
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "text-gray-700 hover:bg-gray-100"
                    }`}
                    title="Copy Link"
                    aria-label="Copy link"
                >
                    {copied ? <LuCheck className="w-4 h-4 text-white" /> : <LuLink className="w-4 h-4" />}
                </button>
            </div>
        );
    }

    if (variant === "compact") {
        return (
            <div className={`flex items-center gap-1.5 ${className}`}>
                {canNativeShare && (
                    <button
                        onClick={handleNativeShare}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 hover:bg-primary/10 text-gray-700 hover:text-primary transition-all duration-200"
                        title="Share"
                        aria-label="Share via device"
                    >
                        <LuShare2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                    </button>
                )}
                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full text-[#25D366] bg-[#25D366]/10 hover:bg-[#25D366] hover:text-white transition-all duration-200"
                    title="Share on WhatsApp"
                    aria-label="Share on WhatsApp"
                >
                    <FaWhatsapp className="w-3.5 h-3.5" />
                </a>
                <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full text-gray-700 bg-gray-100 hover:bg-black hover:text-white transition-all duration-200"
                    title="Share on X (Twitter)"
                    aria-label="Share on X"
                >
                    <FaTwitter className="w-3.5 h-3.5" />
                </a>
                <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full text-[#0A66C2] bg-[#0A66C2]/10 hover:bg-[#0A66C2] hover:text-white transition-all duration-200"
                    title="Share on LinkedIn"
                    aria-label="Share on LinkedIn"
                >
                    <FaLinkedin className="w-3.5 h-3.5" />
                </a>
                <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full text-[#1877F2] bg-[#1877F2]/10 hover:bg-[#1877F2] hover:text-white transition-all duration-200"
                    title="Share on Facebook"
                    aria-label="Share on Facebook"
                >
                    <FaFacebook className="w-3.5 h-3.5" />
                </a>
                <button
                    onClick={handleCopy}
                    className={`relative inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                        copied
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                    title="Copy Link"
                    aria-label="Copy link"
                >
                    {copied ? (
                        <>
                            <LuCheck className="w-3.5 h-3.5 text-white" />
                            <span>Copied!</span>
                        </>
                    ) : (
                        <>
                            <LuLink className="w-3.5 h-3.5" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
        );
    }

    // Default "card" variant
    return (
        <div className={`p-6 rounded-2xl bg-secondary/5 border border-secondary/15 text-center ${className}`}>
            <div className="flex items-center justify-center gap-2 mb-2 text-primary font-serif text-lg font-semibold">
                <LuShare2 className="w-5 h-5 text-secondary" />
                <span>Share this Article</span>
            </div>
            <p className="text-xs sm:text-sm text-text/70 mb-5 max-w-md mx-auto">
                Spread the wisdom of yoga and mindful living with your friends, family, and community.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                {canNativeShare && (
                    <button
                        onClick={handleNativeShare}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-white shadow-sm hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <LuShare2 className="w-4 h-4" />
                        <span>Share</span>
                    </button>
                )}

                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#25D366] text-white shadow-sm hover:bg-[#20ba59] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <FaWhatsapp className="w-4 h-4" />
                    <span>WhatsApp</span>
                </a>

                <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gray-900 text-white shadow-sm hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <FaTwitter className="w-4 h-4" />
                    <span>X (Twitter)</span>
                </a>

                <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#0A66C2] text-white shadow-sm hover:bg-[#084e96] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <FaLinkedin className="w-4 h-4" />
                    <span>LinkedIn</span>
                </a>

                <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#1877F2] text-white shadow-sm hover:bg-[#155fc2] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <FaFacebook className="w-4 h-4" />
                    <span>Facebook</span>
                </a>

                <button
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                        copied
                            ? "bg-emerald-600 text-white shadow-emerald-200"
                            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    {copied ? (
                        <>
                            <LuCheck className="w-4 h-4 text-white" />
                            <span>Link Copied!</span>
                        </>
                    ) : (
                        <>
                            <LuLink className="w-4 h-4" />
                            <span>Copy Link</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
