"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";

type TimeZoneKey = "IST" | "EST" | "PST" | "GMT" | "AEST";

interface ScheduleSlot {
    type: string;
    level: string;
    times: Record<TimeZoneKey, string>;
    focus: string;
}

const SCHEDULE: ScheduleSlot[] = [
    {
        type: "Dawn Vinyasa Flow",
        level: "Intermediate",
        times: {
            IST: "6:00 AM – 7:00 AM",
            EST: "8:30 PM (prev eve)",
            PST: "5:30 PM (prev eve)",
            GMT: "1:30 AM",
            AEST: "10:30 AM",
        },
        focus: "Spinal energization, breath-synchronized flow & Surya Namaskars to awaken vitality.",
    },
    {
        type: "Traditional Hatha & Alignment",
        level: "Beginner & All Levels",
        times: {
            IST: "7:30 AM – 8:30 AM",
            EST: "10:00 PM (prev eve)",
            PST: "7:00 PM (prev eve)",
            GMT: "3:00 AM",
            AEST: "12:00 PM (noon)",
        },
        focus: "Steady posture holds, joint mobility, core stabilization, and breath awareness.",
    },
    {
        type: "Gentle Hatha & Spine Health",
        level: "Beginner / Therapeutic",
        times: {
            IST: "5:00 PM – 6:00 PM",
            EST: "7:30 AM (morning)",
            PST: "4:30 AM (morning)",
            GMT: "12:30 PM (lunchtime)",
            AEST: "9:30 PM (evening)",
        },
        focus: "Targeting desk fatigue, shoulder tension, lower back stiffness, and calming pranayama.",
    },
    {
        type: "Power Yoga & Core Stability",
        level: "Intermediate / Advanced",
        times: {
            IST: "6:30 PM – 7:30 PM",
            EST: "9:00 AM (morning)",
            PST: "6:00 AM (morning)",
            GMT: "2:00 PM (afternoon)",
            AEST: "11:00 PM (night)",
        },
        focus: "Strength conditioning, functional balance, stamina, and deep hip openers.",
    },
    {
        type: "Restorative Pranayama & Meditation",
        level: "All Levels",
        times: {
            IST: "8:00 PM – 9:00 PM",
            EST: "10:30 AM (morning)",
            PST: "7:30 AM (morning)",
            GMT: "3:30 PM (afternoon)",
            AEST: "12:30 AM (night)",
        },
        focus: "Nervous system down-regulation, cooling breathwork, Yoga Nidra, and inner stillness.",
    },
];

const TIMEZONE_LABELS: Record<TimeZoneKey, { name: string; region: string }> = {
    IST: { name: "India (IST)", region: "India Standard Time (UTC+5:30)" },
    EST: { name: "US East (EST/EDT)", region: "New York, Toronto, Atlanta" },
    PST: { name: "US West (PST/PDT)", region: "California, Vancouver, Seattle" },
    GMT: { name: "UK & Europe (GMT/BST)", region: "London, Dublin, Western Europe" },
    AEST: { name: "Australia (AEST)", region: "Sydney, Melbourne, Brisbane" },
};

export default function EverydayYogaPage() {
    const [selectedTz, setSelectedTz] = useState<TimeZoneKey>("IST");

    return (
        <main className="bg-background min-h-screen">
            <PageHeader
                title="Everyday Yoga — Daily Live Classes"
                subtitle="Five days a week over live Google Meet with real-time teacher corrections. Build a lifelong practice rooted in authentic Indian lineage."
            />

            {/* Video Class Preview Section */}
            <section className="py-12 sm:py-16 px-4 sm:px-8 bg-stone-900 text-white">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-8">
                        <span className="text-secondary text-xs font-bold uppercase tracking-widest block mb-2">Class Preview</span>
                        <h2 className="font-serif text-2xl sm:text-3xl text-white font-bold">What to Expect on Your Mat</h2>
                        <p className="text-white/70 text-sm mt-2 max-w-xl mx-auto">
                            Authentic, steady movement synchronized with breath. Our teachers observe your camera feed and offer verbal postural cues throughout.
                        </p>
                    </div>

                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
                        <video
                            src="/videos/practice-preview.webm"
                            controls
                            playsInline
                            className="w-full h-full object-cover"
                        >
                            Your browser does not support HTML5 video.
                        </video>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4 mt-6 text-xs text-white/80 text-center sm:text-left">
                        <div className="p-3.5 bg-white/5 rounded-xl border border-white/10">
                            <span className="text-emerald-400 font-bold block mb-1">✦ Real-time feedback</span>
                            Teachers watch camera feeds and cue safe posture adjustments live.
                        </div>
                        <div className="p-3.5 bg-white/5 rounded-xl border border-white/10">
                            <span className="text-emerald-400 font-bold block mb-1">✦ Guided Pranayama</span>
                            Every session closes with 10–15 minutes of structured breathwork.
                        </div>
                        <div className="p-3.5 bg-white/5 rounded-xl border border-white/10">
                            <span className="text-emerald-400 font-bold block mb-1">✦ 24-Hr Recordings</span>
                            Miss a morning slot? Replay today&apos;s recording directly from your portal.
                        </div>
                    </div>
                </div>
            </section>

            {/* Interactive Schedule Section with Timezone Switcher */}
            <section className="py-14 sm:py-20 px-4 sm:px-8 max-w-5xl mx-auto">
                <div className="text-center mb-10">
                    <span className="text-secondary text-xs font-bold uppercase tracking-widest block mb-2">Live Weekly Schedule</span>
                    <h2 className="font-serif text-3xl sm:text-4xl text-primary font-bold">Find Your Ideal Class Time</h2>
                    <p className="font-sans text-xs sm:text-sm text-text/70 mt-2">
                        Classes run Monday through Friday. Select your region below to view exact local class timings.
                    </p>
                </div>

                {/* Time Zone Buttons */}
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8">
                    {(Object.keys(TIMEZONE_LABELS) as TimeZoneKey[]).map((tz) => (
                        <button
                            key={tz}
                            onClick={() => setSelectedTz(tz)}
                            className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                                selectedTz === tz
                                    ? "bg-primary text-white shadow-md transform scale-105"
                                    : "bg-white text-text/70 border border-primary/10 hover:border-secondary hover:text-secondary"
                            }`}
                        >
                            {TIMEZONE_LABELS[tz].name}
                        </button>
                    ))}
                </div>

                <p className="text-center text-xs text-text/60 mb-6 italic">
                    Showing times for: <span className="font-bold text-primary">{TIMEZONE_LABELS[selectedTz].region}</span>
                </p>

                {/* Schedule Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-primary/15 overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {SCHEDULE.map((slot, index) => (
                            <div
                                key={index}
                                className="p-5 sm:p-6 hover:bg-accent/15 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="md:w-1/3">
                                    <span className="font-mono text-base sm:text-lg font-bold text-primary block">
                                        {slot.times[selectedTz]}
                                    </span>
                                    <span className="font-serif text-lg text-text font-bold mt-0.5 block">
                                        {slot.type}
                                    </span>
                                    <span
                                        className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            slot.level.includes("Beginner")
                                                ? "bg-emerald-100 text-emerald-800"
                                                : slot.level.includes("Intermediate")
                                                ? "bg-amber-100 text-amber-800"
                                                : "bg-blue-100 text-blue-800"
                                        }`}
                                    >
                                        {slot.level}
                                    </span>
                                </div>

                                <div className="md:w-1/2">
                                    <p className="font-sans text-xs sm:text-sm text-text/75 leading-relaxed">
                                        {slot.focus}
                                    </p>
                                </div>

                                <div className="md:w-1/6 flex md:justify-end">
                                    <Link
                                        href="/trial"
                                        className="inline-block px-4 py-2 bg-secondary text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-primary transition-colors text-center"
                                    >
                                        Try Slot →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-10 text-center space-y-4">
                    <p className="font-sans text-xs sm:text-sm text-text/60">
                        * All classes run live over Google Meet. Unlimited access to any batch comes included with all Everyday Yoga memberships.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                        <Link
                            href="/trial"
                            className="px-8 py-3.5 bg-secondary text-white font-sans font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-primary transition-colors shadow-md text-center"
                        >
                            Start 7-Day Free Trial
                        </Link>
                        <Link
                            href="/programs"
                            className="px-8 py-3.5 border-2 border-primary text-primary font-sans font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-primary hover:text-white transition-colors text-center"
                        >
                            View All Pricing Plans
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
