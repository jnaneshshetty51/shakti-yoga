"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LuHeart } from "react-icons/lu";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
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
            <PageHeader title="My Classes" subtitle="Your live group-class schedule, in IST." />

            {loading ? (
                <Card><EmptyState icon={LuHeart} title="Loading your classes…" /></Card>
            ) : !data ? (
                <Card><EmptyState icon={LuHeart} title="Couldn't load your classes" hint="Please refresh the page." /></Card>
            ) : !data.access.ok ? (
                <AccessNotice access={data.access} />
            ) : (
                <>
                    {data.access.ok && data.access.sessionBalance && (
                        <Card padded className="mb-6 flex items-center justify-between gap-4">
                            <div>
                                <div className="text-2xl font-bold text-gray-800">
                                    {data.access.sessionBalance.remaining}
                                    <span className="text-gray-400 text-lg"> / {data.access.sessionBalance.perCycle}</span>
                                </div>
                                <div className="text-sm text-gray-500">sessions left this cycle</div>
                            </div>
                            <div className="text-xs text-gray-400 text-right">
                                Refreshes<br />
                                {new Date(data.access.sessionBalance.cycleEnd).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
                            </div>
                        </Card>
                    )}

                    <section className="mb-8">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Today</h2>
                        {data.today.length === 0 ? (
                            <Card padded className="text-sm text-gray-500">No class scheduled for today.</Card>
                        ) : (
                            <div className="space-y-3">
                                {data.today.map((cls) => (
                                    <Card key={cls.id} padded className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-800">{cls.batchName}</span>
                                                {cls.joinable && <Badge tone="green">Open now</Badge>}
                                            </div>
                                            <div className="text-sm text-gray-500 mt-0.5">
                                                {fmtTime(cls.startsAt)} – {fmtTime(cls.endsAt)} IST · {cls.teacher}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => join(cls)}
                                            disabled={!cls.joinable || joiningId === cls.id}
                                            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                                                cls.joinable ? "bg-primary text-white hover:bg-primary/90" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                            }`}
                                        >
                                            {joiningId === cls.id ? "Opening…" : cls.joinable ? "Join Google Meet" : "Opens near start time"}
                                        </button>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Upcoming</h2>
                        {data.upcoming.length === 0 ? (
                            <Card padded className="text-sm text-gray-500">Nothing scheduled in the next week yet.</Card>
                        ) : (
                            <Card className="divide-y divide-gray-50">
                                {data.upcoming.map((cls) => (
                                    <div key={cls.id} className="px-5 py-3.5 flex justify-between items-center gap-4">
                                        <div className="text-sm">
                                            <span className="font-semibold text-gray-700">{fmtDay(cls.startsAt)}</span>
                                            <span className="text-gray-400"> · {fmtTime(cls.startsAt)} IST</span>
                                        </div>
                                        <div className="text-sm text-gray-500">{cls.batchName}</div>
                                    </div>
                                ))}
                            </Card>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

function AccessNotice({ access }: { access: Extract<ClassAccessInfo, { ok: false }> }) {
    if (access.outOfSessions) {
        return (
            <Card padded className="text-center py-12">
                <div className="text-5xl mb-3">⏳</div>
                <h2 className="font-serif text-2xl text-gray-800 mb-2">No sessions left this cycle</h2>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">{access.reason}</p>
                <Link
                    href="/dashboard/support"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-secondary text-white text-sm font-semibold hover:bg-primary transition-colors"
                >
                    Ask about an extra session
                </Link>
            </Card>
        );
    }
    return (
        <Card padded className="text-center py-12">
            <div className="text-5xl mb-3">{access.paywall ? "🔒" : "🧘"}</div>
            <h2 className="font-serif text-2xl text-gray-800 mb-2">
                {access.paywall ? "Membership required" : "1:1 sessions"}
            </h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">{access.reason}</p>
            <Link
                href={access.paywall ? "/programs" : "/dashboard/therapy/book"}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-secondary text-white text-sm font-semibold hover:bg-primary transition-colors"
            >
                {access.paywall ? "View plans" : "Book a session"}
            </Link>
        </Card>
    );
}
