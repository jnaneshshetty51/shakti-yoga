import PageHeader from "@/components/PageHeader";
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Everyday Yoga — Live Group Classes",
    description: "Five live yoga classes a week over Google Meet, across time zones. Community, consistency and a daily practice that sticks.",
    alternates: { canonical: "/everyday-yoga" },
};

export default function ClassesPage() {
    const schedule = [
        { time: "6:00 AM - 7:00 AM IST", type: "Vinyasa Flow", level: "Intermediate" },
        { time: "7:30 AM - 8:30 AM IST", type: "Hatha Yoga", level: "Beginner/All" },
        { time: "5:00 PM - 6:00 PM IST", type: "Hatha Yoga", level: "Beginner/All" },
        { time: "6:30 PM - 7:30 PM IST", type: "Power Yoga", level: "Intermediate" },
        { time: "8:00 PM - 9:00 PM IST", type: "Restorative/Meditation", level: "All Levels" },
    ];

    return (
        <main>
            <PageHeader
                title="Online Group Classes"
                subtitle="Join our vibrant community from anywhere in the world. Live, interactive, and energizing."
            />

            <section className="py-12 sm:py-20 px-4 sm:px-8 bg-background">
                <div className="max-w-4xl mx-auto">
                    <h2 className="font-serif text-2xl sm:text-3xl text-primary text-center mb-8 sm:mb-12">Daily Schedule (Mon-Fri)</h2>

                    <div className="bg-white rounded-lg shadow-md overflow-x-auto border border-primary/10">
                        <div className="min-w-[500px]">
                            <div className="grid grid-cols-3 bg-primary text-white p-4 font-serif font-bold text-base sm:text-lg">
                                <div>Time (IST)</div>
                                <div>Class Type</div>
                                <div>Level</div>
                            </div>
                            {schedule.map((slot, index) => (
                                <div key={index} className="grid grid-cols-3 p-4 border-b border-gray-100 hover:bg-accent/20 transition-colors font-sans text-text/80 text-sm sm:text-base items-center">
                                    <div className="font-bold text-primary">{slot.time}</div>
                                    <div>{slot.type}</div>
                                    <div>
                                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${slot.level.includes("Beginner") ? "bg-green-100 text-green-800" :
                                                slot.level.includes("Intermediate") ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"
                                            }`}>
                                            {slot.level}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 sm:mt-12 text-center">
                        <p className="font-sans text-xs sm:text-sm text-text/70 mb-6">
                            * All classes are conducted live via Zoom. Recordings are available for 24 hours.
                        </p>
                        <Link href="/programs" className="inline-block w-full sm:w-auto px-8 py-3.5 bg-secondary text-white font-sans font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors text-center text-sm">
                            View Pricing Plans
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
