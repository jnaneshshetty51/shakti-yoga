"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ClassView, ClassesResponse, ClassAccessInfo } from "@/types/class";

function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
    });
}

function fmtDay(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        timeZone: "Asia/Kolkata",
    });
}

export default function ClassesPage() {
    const [data, setData] = useState<ClassesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [joiningId, setJoiningId] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/classes");
                if (res.ok) setData(await res.json());
            } catch (error) {
                console.error("Failed to load classes:", error);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const join = async (cls: ClassView) => {
        setJoiningId(cls.id);
        try {
            const res = await fetch(`/api/classes/${cls.id}/join`, { method: "POST" });
            const body = await res.json();
            if (res.ok && body.meetingLink) {
                window.open(body.meetingLink, "_blank", "noopener,noreferrer");
            } else {
                alert(body.error || "Could not join the class.");
            }
        } catch {
            alert("Could not join the class. Please try again.");
        } finally {
            setJoiningId(null);
        }
    };

    return (
        <div>
            <h1 className="font-serif text-3xl text-primary mb-8">My Classes</h1>

            {loading ? (
                <div className="text-gray-500 italic">Loading…</div>
            ) : !data ? (
                <div className="text-gray-500 italic">Could not load your classes. Please refresh.</div>
            ) : !data.access.ok ? (
                <AccessNotice access={data.access} />
            ) : (
                <>
                    <section className="mb-10">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-text/50 mb-4">Today</h2>
                        {data.today.length === 0 ? (
                            <div className="bg-white p-6 rounded-lg border border-primary/10 text-gray-500 italic">
                                No class scheduled for today.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {data.today.map((cls) => (
                                    <div
                                        key={cls.id}
                                        className="bg-white p-6 rounded-lg shadow-sm border border-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                    >
                                        <div>
                                            <div className="font-bold text-lg text-primary">{cls.batchName}</div>
                                            <div className="text-sm text-text/70">
                                                {fmtTime(cls.startsAt)} – {fmtTime(cls.endsAt)} IST · {cls.teacher}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => join(cls)}
                                            disabled={!cls.joinable || joiningId === cls.id}
                                            className={`px-6 py-3 font-bold uppercase tracking-widest text-xs rounded transition-colors whitespace-nowrap ${cls.joinable
                                                ? "bg-secondary text-white hover:bg-primary"
                                                : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                                        >
                                            {joiningId === cls.id
                                                ? "Opening…"
                                                : cls.joinable
                                                    ? "Join Google Meet"
                                                    : "Opens near start time"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-text/50 mb-4">Upcoming</h2>
                        {data.upcoming.length === 0 ? (
                            <div className="text-gray-500 italic">Nothing scheduled in the next week yet.</div>
                        ) : (
                            <div className="divide-y divide-gray-100 bg-white rounded-lg border border-primary/10">
                                {data.upcoming.map((cls) => (
                                    <div key={cls.id} className="p-4 flex justify-between items-center">
                                        <div className="text-sm">
                                            <span className="font-bold text-text/80">{fmtDay(cls.startsAt)}</span>
                                            <span className="text-text/60"> · {fmtTime(cls.startsAt)} IST</span>
                                        </div>
                                        <div className="text-sm text-text/70">{cls.batchName}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

function AccessNotice({ access }: { access: Extract<ClassAccessInfo, { ok: false }> }) {
    return (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-primary/10 text-center py-12">
            <div className="text-6xl mb-4">{access.paywall ? "🔒" : "🧘"}</div>
            <h2 className="font-serif text-2xl text-primary mb-4">
                {access.paywall ? "Membership Required" : "1:1 Sessions"}
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">{access.reason}</p>
            <Link
                href={access.paywall ? "/programs" : "/dashboard/therapy/book"}
                className="inline-block px-6 py-3 bg-secondary text-white font-bold uppercase tracking-widest text-xs rounded hover:bg-primary transition-colors"
            >
                {access.paywall ? "View Plans" : "Book a Session"}
            </Link>
        </div>
    );
}
