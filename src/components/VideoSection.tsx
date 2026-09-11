"use client";

import { useRef, useState } from "react";
import Link from "next/link";

interface VideoClip {
    id: string;
    title: string;
    subtitle: string;
    duration: string;
    level: string;
    src: string;
    description: string;
    cues: string[];
    teacher: string;
}

const CLIPS: VideoClip[] = [
    {
        id: "morning-flow",
        title: "Morning Vinyasa & Wake-Up Flow",
        subtitle: "Gentle spinal wave, reverse prayer and back-opening sequence",
        duration: "10 mins (sample)",
        level: "All Levels",
        src: "/videos/practice-preview.webm",
        description:
            "Experience how our teachers guide each movement with breath awareness. Notice the steady, traditional pacing designed to build vitality without strain.",
        cues: [
            "Rooting through the feet with steady mountain foundation",
            "Opening the heart with supported reverse prayer alignment",
            "Coordinating smooth inhalation with lengthening spine",
        ],
        teacher: "Acharya Swastik & Priya Sharma",
    },
    {
        id: "breath-flow",
        title: "Chest Opening & Deep Pranayama",
        subtitle: "Interlaced hands extension to expand lung capacity",
        duration: "8 mins (sample)",
        level: "Gentle / Beginner",
        src: "/videos/breath-flow.mp4",
        description:
            "Targeting postural slump from sitting at computers and phones. A therapeutic sequence releasing chest tightness and resetting shallow breathing patterns.",
        cues: [
            "Shoulders rolled back and relaxed downward",
            "Slow 4-count inhale expanding the ribcage",
            "Gentle hold releasing tension across the upper back",
        ],
        teacher: "Priya Sharma",
    },
    {
        id: "therapy-alignment",
        title: "Therapeutic Posture & Spine Alignment",
        subtitle: "Elbow-lock alignment to decompress shoulders and neck",
        duration: "12 mins (sample)",
        level: "Therapeutic / 1:1",
        src: "/videos/gentle-therapy.mp4",
        description:
            "A glimpse into our 1:1 Yoga Therapy methodology. Designed for chronic lower back fatigue, desk hunching, and frozen shoulder relief.",
        cues: [
            "Neutral spine with engaged core support",
            "Micro-adjustments for shoulder blade retraction",
            "Long soothing exhales calming sympathetic nervous system",
        ],
        teacher: "Dr. Arun Joshi",
    },
];

export default function VideoSection() {
    const [selectedClip, setSelectedClip] = useState<VideoClip>(CLIPS[0]);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleSelectClip = (clip: VideoClip) => {
        setSelectedClip(clip);
        setIsPlaying(false);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.pause();
        }
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    return (
        <section className="py-16 sm:py-24 px-4 sm:px-8 bg-stone-900 text-white relative overflow-hidden">
            {/* Ambient backdrop glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/20 blur-[130px] -z-0 pointer-events-none rounded-full" />

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 border border-secondary/30 text-secondary text-xs font-bold uppercase tracking-widest mb-4">
                        <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
                        Class Preview in Action
                    </div>
                    <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                        Experience a Shakti Yoga Class
                    </h2>
                    <p className="font-sans text-white/80 text-base sm:text-lg leading-relaxed">
                        Step onto the mat with our teachers. Watch authentic guided practices, breath cues, and therapeutic alignments before your first class.
                    </p>
                </div>

                {/* Main Video Showcase */}
                <div className="grid lg:grid-cols-12 gap-8 items-start">
                    {/* Video Player Box (7 cols) */}
                    <div className="lg:col-span-7 flex flex-col">
                        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl group">
                            <video
                                ref={videoRef}
                                key={selectedClip.src}
                                src={selectedClip.src}
                                playsInline
                                loop
                                controls
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                className="w-full h-full object-cover"
                            />

                            {/* Center Play Overlay when paused */}
                            {!isPlaying && (
                                <button
                                    onClick={togglePlay}
                                    className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-secondary/90 hover:bg-secondary text-white flex items-center justify-center shadow-xl transform transition-transform hover:scale-110 active:scale-95"
                                    aria-label="Play sample video"
                                >
                                    <svg className="w-8 h-8 ml-1 fill-current" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </button>
                            )}

                            {/* Top badge */}
                            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full text-[11px] font-semibold tracking-wider text-emerald-400 border border-emerald-500/20">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                {selectedClip.level}
                            </div>
                        </div>

                        {/* Video metadata under player */}
                        <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/70">
                            <div>
                                <p className="font-serif font-bold text-sm text-white">{selectedClip.title}</p>
                                <p className="text-white/60 mt-0.5">Led by {selectedClip.teacher}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="px-2.5 py-1 rounded bg-white/10 text-white/90 font-mono">
                                    {selectedClip.duration}
                                </span>
                                <Link
                                    href="/trial"
                                    className="px-4 py-1.5 bg-secondary hover:bg-primary text-white font-bold uppercase tracking-widest text-[11px] rounded transition-colors"
                                >
                                    Join Live →
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Clip Selector Tabs (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-secondary mb-1">
                            Select Practice Clip:
                        </h3>

                        {CLIPS.map((clip) => {
                            const isSelected = clip.id === selectedClip.id;
                            return (
                                <button
                                    key={clip.id}
                                    onClick={() => handleSelectClip(clip)}
                                    className={`w-full text-left p-4 sm:p-5 rounded-xl border transition-all ${
                                        isSelected
                                            ? "bg-white/15 border-secondary shadow-lg ring-1 ring-secondary/50"
                                            : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <h4 className="font-serif text-base font-bold text-white">
                                            {clip.title}
                                        </h4>
                                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                                            {clip.duration}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/70 font-sans line-clamp-2 leading-relaxed">
                                        {clip.subtitle}
                                    </p>

                                    {isSelected && (
                                        <div className="mt-3 pt-3 border-t border-white/10">
                                            <p className="text-[11px] text-white/80 leading-relaxed mb-2 italic">
                                                "{clip.description}"
                                            </p>
                                            <ul className="space-y-1">
                                                {clip.cues.map((cue, idx) => (
                                                    <li key={idx} className="flex items-center gap-2 text-[11px] text-emerald-300">
                                                        <span>✦</span> {cue}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom live class reassurance */}
                <div className="mt-12 text-center pt-8 border-t border-white/10">
                    <p className="text-xs sm:text-sm text-white/60 font-sans">
                        All regular classes are held live via Google Meet with two-way teacher interaction and postural corrections.
                    </p>
                </div>
            </div>
        </section>
    );
}
