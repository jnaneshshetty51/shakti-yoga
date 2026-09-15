"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
    LuPlay,
    LuPause,
    LuVolume2,
    LuVolumeX,
    LuHeart,
    LuShare2,
    LuExternalLink,
    LuCheck,
    LuDisc,
    LuMaximize2,
} from "react-icons/lu";
import { FaInstagram } from "react-icons/fa";

export interface ReelPlayerProps {
    title: string;
    caption?: string | null;
    videoUrl?: string | null;
    imageUrl?: string | null;
    instagramUrl?: string | null;
    author?: string | null;
    initialLikes?: number;
    tags?: string[];
}

function extractInstagramCode(url: string | null | undefined): { code: string; type: "reel" | "p" | "tv" } | null {
    if (!url) return null;
    const match = url.match(/instagram\.com\/(reel|p|tv)\/([A-Za-z0-9_-]+)/i);
    if (!match) return null;
    return { type: match[1].toLowerCase() as "reel" | "p" | "tv", code: match[2] };
}

export default function ReelPlayer({
    title,
    caption,
    videoUrl,
    imageUrl,
    instagramUrl,
    author = "Shakti Yoga Kendra",
    initialLikes = 48,
    tags = [],
}: ReelPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const igInfo = extractInstagramCode(instagramUrl);
    const hasNativeVideo = Boolean(videoUrl);
    const hasInstagram = Boolean(igInfo);

    // If both exist, allow toggling mode. Default to native player if videoUrl is present, otherwise embed.
    const [viewMode, setViewMode] = useState<"player" | "embed">(hasNativeVideo ? "player" : "embed");

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [progress, setProgress] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [likes, setLikes] = useState(initialLikes);
    const [copied, setCopied] = useState(false);
    const [expandedCaption, setExpandedCaption] = useState(false);
    const [showPlayIcon, setShowPlayIcon] = useState(false);

    // Handle play/pause toggle
    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
        setShowPlayIcon(true);
        setTimeout(() => setShowPlayIcon(false), 600);
    };

    // Handle mute toggle
    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!videoRef.current) return;
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(videoRef.current.muted);
    };

    // Update progress bar
    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const current = videoRef.current.currentTime;
        const duration = videoRef.current.duration || 1;
        setProgress((current / duration) * 100);
    };

    // Toggle Like
    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsLiked((prev) => {
            const next = !prev;
            setLikes((l) => (next ? l + 1 : l - 1));
            return next;
        });
    };

    // Handle Share
    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareUrl = typeof window !== "undefined" ? window.location.href : (instagramUrl || "");
        if (navigator.share) {
            try {
                await navigator.share({ title, text: caption || title, url: shareUrl });
                return;
            } catch {
                // fall through to clipboard
            }
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Fullscreen toggle
    const toggleFullscreen = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    // When viewMode changes or mounts, attempt to play native video
    useEffect(() => {
        if (viewMode === "player" && videoRef.current) {
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
    }, [viewMode]);

    return (
        <div className="w-full flex flex-col items-center my-6">
            {/* Mode Switcher Tabs (if both native video and Instagram embed exist) */}
            {hasNativeVideo && hasInstagram && (
                <div className="flex items-center gap-2 mb-4 p-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs">
                    <button
                        type="button"
                        onClick={() => setViewMode("player")}
                        className={`px-4 py-1.5 rounded-full font-semibold transition-all ${
                            viewMode === "player"
                                ? "bg-primary text-white shadow"
                                : "text-neutral-400 hover:text-white"
                        }`}
                    >
                        Reels Player
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("embed")}
                        className={`px-4 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
                            viewMode === "embed"
                                ? "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow"
                                : "text-neutral-400 hover:text-white"
                        }`}
                    >
                        <FaInstagram className="text-sm" />
                        <span>Instagram View</span>
                    </button>
                </div>
            )}

            {/* Smartphone / Reels Vertical Container */}
            <div
                ref={containerRef}
                className="relative w-full max-w-[390px] aspect-[9/16] rounded-[36px] bg-neutral-950 border-[6px] border-neutral-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col select-none"
            >
                {/* Phone Speaker / Dynamic Island Notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-black/90 rounded-full z-30 pointer-events-none flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-900/90" />
                </div>

                {/* VIEW MODE: INSTAGRAM EMBED */}
                {viewMode === "embed" && igInfo ? (
                    <div className="relative w-full h-full flex flex-col bg-neutral-900">
                        {/* Reels Top Bar */}
                        <div className="pt-8 px-4 pb-2 flex items-center justify-between z-20 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/60">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white text-xs shadow-sm">
                                    <FaInstagram />
                                </div>
                                <span className="font-semibold text-xs text-white tracking-wide">Instagram Reel</span>
                            </div>
                            {instagramUrl && (
                                <a
                                    href={instagramUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-medium text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                                >
                                    Open App <LuExternalLink className="text-xs" />
                                </a>
                            )}
                        </div>

                        {/* Embed Iframe */}
                        <div className="flex-1 w-full relative overflow-hidden bg-black">
                            <iframe
                                src={`https://www.instagram.com/${igInfo.type}/${igInfo.code}/embed/`}
                                className="w-full h-full border-0"
                                allowFullScreen
                                scrolling="no"
                                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                title={title}
                            />
                        </div>
                    </div>
                ) : (
                    /* VIEW MODE: NATIVE REELS VIDEO PLAYER */
                    <div
                        onClick={togglePlay}
                        className="relative w-full h-full cursor-pointer group bg-black"
                    >
                        {videoUrl ? (
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                poster={imageUrl ?? undefined}
                                playsInline
                                loop
                                muted={isMuted}
                                onTimeUpdate={handleTimeUpdate}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                className="w-full h-full object-cover"
                            />
                        ) : imageUrl ? (
                            // Fallback image poster if videoUrl is unavailable
                            <div className="relative w-full h-full">
                                <Image
                                    src={imageUrl}
                                    alt={title}
                                    fill
                                    className="object-cover"
                                    sizes="400px"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl">
                                        <LuPlay className="ml-1" />
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {/* Center Animated Play/Pause Ripple */}
                        {showPlayIcon && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20 animate-ping">
                                <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center text-2xl shadow-xl">
                                    {isPlaying ? <LuPlay className="ml-1" /> : <LuPause />}
                                </div>
                            </div>
                        )}

                        {/* Top Controls Overlay */}
                        <div className="absolute top-7 inset-x-4 flex items-center justify-between z-20 pointer-events-auto">
                            {/* Reels Pill Badge */}
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white text-xs font-bold shadow-lg">
                                <FaInstagram className="text-sm" />
                                <span>Reels</span>
                            </div>

                            {/* Sound & Fullscreen Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleMute}
                                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow"
                                    aria-label={isMuted ? "Unmute sound" : "Mute sound"}
                                >
                                    {isMuted ? <LuVolumeX className="text-sm" /> : <LuVolume2 className="text-sm text-green-400" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleFullscreen}
                                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow"
                                    aria-label="Toggle fullscreen"
                                >
                                    <LuMaximize2 className="text-sm" />
                                </button>
                            </div>
                        </div>

                        {/* Right Vertical Action Bar (Reels Style) */}
                        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-4 z-20 pointer-events-auto">
                            {/* Like Button */}
                            <button
                                type="button"
                                onClick={handleLike}
                                className="group/btn flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
                                aria-label="Like reel"
                            >
                                <div className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center text-xl transition-colors shadow-lg ${
                                    isLiked ? "bg-rose-600 text-white" : "bg-black/50 text-white hover:bg-black/70"
                                }`}>
                                    <LuHeart className={isLiked ? "fill-current" : ""} />
                                </div>
                                <span className="text-[11px] font-bold text-white drop-shadow">
                                    {likes}
                                </span>
                            </button>

                            {/* Share Button */}
                            <button
                                type="button"
                                onClick={handleShare}
                                className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
                                aria-label="Share reel"
                            >
                                <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-xl hover:bg-black/70 transition-colors shadow-lg">
                                    {copied ? <LuCheck className="text-green-400" /> : <LuShare2 />}
                                </div>
                                <span className="text-[11px] font-medium text-white drop-shadow">
                                    {copied ? "Copied" : "Share"}
                                </span>
                            </button>

                            {/* Instagram Link (if available) */}
                            {instagramUrl && (
                                <a
                                    href={instagramUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
                                    aria-label="Open on Instagram"
                                >
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-xl shadow-lg">
                                        <FaInstagram />
                                    </div>
                                    <span className="text-[10px] font-medium text-white drop-shadow">
                                        App
                                    </span>
                                </a>
                            )}
                        </div>

                        {/* Bottom Metadata & Creator Overlay */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-12 px-4 pb-4 z-10 pointer-events-auto">
                            {/* Author Row */}
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 rounded-full bg-primary/40 border-2 border-primary/60 flex items-center justify-center text-white font-bold text-xs">
                                    🕉️
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-white tracking-wide drop-shadow">
                                        {author}
                                    </span>
                                    <span className="w-3.5 h-3.5 rounded-full bg-primary text-white flex items-center justify-center text-[9px]">
                                        ✓
                                    </span>
                                </div>
                            </div>

                            {/* Title & Caption */}
                            <h3 className="text-sm font-semibold text-white mb-1 line-clamp-1 drop-shadow">
                                {title}
                            </h3>
                            {caption && (
                                <div className="mb-2.5">
                                    <p
                                        className={`text-xs text-white/90 leading-relaxed font-sans ${
                                            expandedCaption ? "" : "line-clamp-2"
                                        }`}
                                    >
                                        {caption}
                                    </p>
                                    {caption.length > 80 && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedCaption((c) => !c);
                                            }}
                                            className="text-[11px] font-semibold text-white/70 hover:text-white mt-0.5"
                                        >
                                            {expandedCaption ? "show less" : "...more"}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Tags */}
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {tags.slice(0, 3).map((tag) => (
                                        <span
                                            key={tag}
                                            className="text-[10px] font-medium text-white/80 bg-white/10 px-2 py-0.5 rounded-full"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Music / Audio Track Ticker */}
                            <div className="flex items-center gap-2 text-white/80 text-[11px]">
                                <LuDisc className="text-xs animate-spin" />
                                <span className="truncate">Shakti Yoga Kendra · Original Audio</span>
                            </div>
                        </div>

                        {/* Bottom Scrubber Progress Bar */}
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20 z-20">
                            <div
                                className="h-full bg-rose-500 transition-all duration-100"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Direct CTA Link */}
            {instagramUrl && (
                <div className="mt-4 flex items-center justify-center gap-3 text-xs">
                    <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white font-semibold hover:opacity-90 transition-opacity shadow-sm"
                    >
                        <FaInstagram className="text-sm" />
                        <span>Watch Directly on Instagram</span>
                        <LuExternalLink className="text-xs" />
                    </a>
                </div>
            )}
        </div>
    );
}
