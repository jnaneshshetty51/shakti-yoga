"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
    LuMessageSquare, LuCalendarClock, LuArrowRight, LuExternalLink, LuTriangleAlert,
} from "react-icons/lu";
import { Card, Badge } from "@/components/ui";
import type { ClassView, ClassesResponse, ClassAccessInfo } from "@/types/class";

interface CommunityGroup {
    id: string;
    name: string;
    whatsappLink: string;
    pinnedMessage: string;
}

function formatWhen(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
    });
}

export default function DashboardPage() {
    const { user, isLoading } = useAuth();
    const [group, setGroup] = useState<CommunityGroup | null>(null);
    const [nextClass, setNextClass] = useState<ClassView | null>(null);
    const [access, setAccess] = useState<ClassAccessInfo | null>(null);
    const [joining, setJoining] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const userId = user?.id;

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        (async () => {
            try {
                setLoadError(false);
                const [communityRes, classesRes] = await Promise.all([
                    fetch("/api/community"),
                    fetch("/api/classes"),
                ]);
                if (!cancelled && communityRes.ok) {
                    const data = await communityRes.json();
                    setGroup(data.groups?.[0] ?? null);
                }
                if (!cancelled && classesRes.ok) {
                    const data: ClassesResponse = await classesRes.json();
                    setNextClass(data.today[0] ?? data.upcoming[0] ?? null);
                    setAccess(data.access ?? null);
                } else if (!cancelled && !classesRes.ok) {
                    setLoadError(true);
                }
            } catch (error) {
                console.error("Dashboard load error:", error);
                if (!cancelled) setLoadError(true);
            }
        })();

        return () => { cancelled = true; };
    }, [userId, reloadKey]);

    if (isLoading) return <div className="p-20 text-center text-gray-400">Loading your dashboard…</div>;
    if (!user) {
        return (
            <div className="p-20 text-center">
                <p className="text-gray-500 mb-4">Your session has ended.</p>
                <Link href="/login?from=/dashboard" className="text-primary font-semibold hover:underline">Log in again</Link>
            </div>
        );
    }

    const handleJoin = async () => {
        if (!nextClass) return;
        setJoining(true);
        try {
            const res = await fetch(`/api/classes/${nextClass.id}/join`, { method: "POST" });
            const data = await res.json();
            if (res.ok && data.meetingLink) {
                window.open(data.meetingLink, "_blank", "noopener,noreferrer");
            } else {
                alert(data.error || "Could not join the class.");
            }
        } catch {
            alert("Could not join the class. Please try again.");
        } finally {
            setJoining(false);
        }
    };

    const planLabel = user.role.replace("member_", "").replace("_", " ");

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                <div>
                    <p className="text-sm text-gray-400">Welcome back,</p>
                    <h1 className="font-serif text-[26px] leading-tight text-gray-800">Namaste, {user.name} 🙏</h1>
                    <p className="text-sm text-gray-500 mt-1">Your practice, your pace — everything in one place.</p>
                </div>
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600 shrink-0">
                    Current plan
                    <span className="font-serif text-secondary capitalize">{planLabel}</span>
                </span>
            </div>

            {loadError && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2 text-amber-800">
                        <LuTriangleAlert className="shrink-0" /> We couldn&rsquo;t load your class schedule just now.
                    </span>
                    <button onClick={() => setReloadKey((k) => k + 1)} className="text-amber-900 font-semibold text-xs hover:underline whitespace-nowrap">
                        Retry
                    </button>
                </div>
            )}

            {group && (
                <Card padded className="mb-6 border-green-100 bg-green-50/60 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex-1">
                        <div className="flex items-center gap-2.5 mb-1.5">
                            <span className="text-xl">🌿</span>
                            <h3 className="font-bold text-green-800">{group.name}</h3>
                        </div>
                        <p className="text-sm text-green-700">
                            Daily class links, motivation and community updates.
                        </p>
                        {group.pinnedMessage && (
                            <p className="mt-3 bg-white/70 p-3 rounded-xl border border-green-100 text-sm text-green-800 italic">
                                &ldquo;{group.pinnedMessage}&rdquo;
                            </p>
                        )}
                    </div>
                    <a
                        href={group.whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors whitespace-nowrap self-start md:self-auto"
                    >
                        Join WhatsApp <LuExternalLink className="text-sm" />
                    </a>
                </Card>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card padded className="relative overflow-hidden">
                        {access && !access.ok ? (
                            <div>
                                <h3 className="font-serif text-xl text-gray-800 mb-1">
                                    {access.paywall ? "Your access has lapsed" : "Your plan is 1:1 therapy"}
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">{access.reason}</p>
                                {access.paywall ? (
                                    <div className="flex flex-wrap gap-2">
                                        <Link href="/checkout?plan=everyday" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
                                            Renew Everyday Yoga
                                        </Link>
                                        <Link href="/programs" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
                                            View plans
                                        </Link>
                                    </div>
                                ) : (
                                    <Link href="/dashboard/therapy/book" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-secondary text-white text-sm font-semibold hover:bg-primary transition-colors">
                                        Book a session <LuArrowRight className="text-sm" />
                                    </Link>
                                )}
                            </div>
                        ) : nextClass ? (
                            <>
                                {nextClass.joinable && (
                                    <span className="absolute top-4 right-4"><Badge tone="green">Open now</Badge></span>
                                )}
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Your next class</p>
                                <h3 className="font-serif text-xl text-gray-800">{nextClass.batchName}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {formatWhen(nextClass.startsAt)} IST · {nextClass.teacher}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    <button
                                        onClick={handleJoin}
                                        disabled={!nextClass.joinable || joining}
                                        className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                                            nextClass.joinable ? "bg-primary text-white hover:bg-primary/90" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        }`}
                                    >
                                        {joining ? "Opening…" : nextClass.joinable ? "Join Google Meet" : "Opens near start time"}
                                    </button>
                                    <Link href="/dashboard/classes" className="px-5 py-2.5 rounded-full border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
                                        Full schedule
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <div>
                                <h3 className="font-serif text-xl text-gray-800 mb-1">No class scheduled</h3>
                                <p className="text-sm text-gray-500 mb-4">Your next class will appear here.</p>
                                <Link href="/dashboard/classes" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
                                    View schedule
                                </Link>
                            </div>
                        )}
                    </Card>

                    <Card padded>
                        <h3 className="font-bold text-gray-800 mb-4">Quick actions</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[
                                { href: "/dashboard/therapy/book", icon: <LuCalendarClock />, label: "Book session" },
                                { href: "/dashboard/classes", icon: <LuMessageSquare />, label: "My classes" },
                                { href: "/dashboard/progress", icon: <LuArrowRight />, label: "My progress" },
                            ].map((a) => (
                                <Link
                                    key={a.href}
                                    href={a.href}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-primary/[0.03] text-center transition-colors"
                                >
                                    <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg">{a.icon}</span>
                                    <span className="text-xs font-semibold text-gray-600">{a.label}</span>
                                </Link>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card padded className="text-center">
                        <div className="w-20 h-20 bg-primary/15 rounded-full mx-auto mb-3 overflow-hidden flex items-center justify-center text-2xl text-primary font-serif">
                            {user.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                user.name.charAt(0)
                            )}
                        </div>
                        <h3 className="font-bold text-gray-800">{user.name}</h3>
                        <p className="text-xs text-gray-500 mb-4 truncate">{user.email}</p>
                        <Link href="/dashboard/profile" className="block w-full py-2 text-center rounded-full border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
                            Edit profile
                        </Link>
                    </Card>

                    {user.role === "member_therapy" && (
                        <Card padded className="bg-secondary/5 border-secondary/15">
                            <h3 className="font-bold text-secondary mb-1">Therapy credits</h3>
                            <div className="text-3xl font-bold text-gray-800">{user.credits ?? 0}</div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Sessions remaining</p>
                            <Link href="/dashboard/therapy/book" className="text-sm font-semibold text-secondary hover:underline">
                                Book now →
                            </Link>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
