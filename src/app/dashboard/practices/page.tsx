"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    PageHeader, PageLoading, ErrorState, Card, Badge, Button, EmptyState, SegmentedControl,
} from "@/components/ui";
import { LuSparkles, LuCheck, LuTrophy, LuFlagTriangleRight, LuLock, LuClock } from "react-icons/lu";

type Tab = "practices" | "challenges" | "badges";

interface Practice {
    id: string;
    title: string;
    description: string | null;
    category: string;
    level: "BEGINNER" | "INTERMEDIATE" | "ALL_LEVELS";
    durationMin: number;
    thumbnailUrl: string | null;
    completed?: boolean;
}

interface Challenge {
    id: string;
    title: string;
    description: string | null;
    goalLabel: string;
    goalTarget: number;
    daysLeft: number;
    participantCount: number;
    joined: boolean;
    progress: number;
    completed: boolean;
}

interface Achievement {
    key: string;
    title: string;
    description: string;
    icon: string;
    earnedAt: string | null;
}

const LEVEL_LABEL: Record<Practice["level"], string> = {
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermediate",
    ALL_LEVELS: "All levels",
};

export default function PracticesHubPage() {
    const [tab, setTab] = useState<Tab>("practices");

    const [practices, setPractices] = useState<Practice[] | null>(null);
    const [challenges, setChallenges] = useState<Challenge[] | null>(null);
    const [achievements, setAchievements] = useState<{ items: Achievement[]; earnedCount: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            const [pRes, cRes, aRes] = await Promise.all([
                fetch("/api/practices", { cache: "no-store" }),
                fetch("/api/challenges", { cache: "no-store" }),
                fetch("/api/me/achievements", { cache: "no-store" }),
            ]);
            if (!pRes.ok || !cRes.ok) throw new Error("load failed");
            const [pData, cData] = await Promise.all([pRes.json(), cRes.json()]);
            setPractices(pData.practices ?? []);
            setChallenges(cData.challenges ?? []);
            if (aRes.ok) {
                const aData = await aRes.json();
                setAchievements({ items: aData.achievements ?? [], earnedCount: aData.earnedCount ?? 0, total: aData.total ?? 0 });
            }
        } catch {
            setError("Could not load your practice library.");
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const toggleJoin = async (c: Challenge) => {
        setBusyId(c.id);
        try {
            await fetch(`/api/challenges/${c.id}/join`, { method: c.joined ? "DELETE" : "POST" });
            await load();
        } finally {
            setBusyId(null);
        }
    };

    const loading = practices === null || challenges === null;
    if (loading && error) return <ErrorState message={error} onRetry={load} />;
    if (loading) return <PageLoading title="Practice" />;

    return (
        <div>
            <PageHeader
                title="Practice"
                subtitle="Guided practices for the days between classes, plus challenges and badges."
            >
                <SegmentedControl<Tab>
                    aria-label="View"
                    options={[
                        { value: "practices", label: "Practices" },
                        { value: "challenges", label: "Challenges" },
                        { value: "badges", label: `Badges${achievements ? ` (${achievements.earnedCount})` : ""}` },
                    ]}
                    value={tab}
                    onChange={setTab}
                />
            </PageHeader>

            {tab === "practices" && (
                practices!.length === 0 ? (
                    <Card><EmptyState icon={LuSparkles} title="No practices yet" hint="Check back soon — new guided practices are added regularly." /></Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {practices!.map((p) => (
                            <Link key={p.id} href={`/dashboard/practices/${p.id}`}>
                                <Card className="overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
                                    <div className="relative h-36 w-full bg-primary/5 shrink-0">
                                        {p.thumbnailUrl ? (
                                            <Image src={p.thumbnailUrl} alt="" fill className="object-cover" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-primary/30 text-4xl"><LuSparkles /></div>
                                        )}
                                        {p.completed && (
                                            <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow">
                                                <LuCheck className="text-xs" />
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col">
                                        <h3 className="font-bold text-gray-800 text-sm mb-1">{p.title}</h3>
                                        {p.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">{p.description}</p>}
                                        <div className="flex items-center gap-2 mt-auto pt-1">
                                            <Badge tone="gray">{LEVEL_LABEL[p.level]}</Badge>
                                            <span className="text-[11px] text-gray-400 flex items-center gap-1"><LuClock /> {p.durationMin} min</span>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )
            )}

            {tab === "challenges" && (
                challenges!.length === 0 ? (
                    <Card><EmptyState icon={LuFlagTriangleRight} title="No challenges running right now" hint="New challenges appear here when Shakti launches one." /></Card>
                ) : (
                    <div className="space-y-4">
                        {challenges!.map((c) => {
                            const pct = Math.min(100, Math.round((c.progress / Math.max(1, c.goalTarget)) * 100));
                            return (
                                <Card key={c.id} padded>
                                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                                        <div>
                                            <h3 className="font-bold text-gray-800">{c.title}</h3>
                                            {c.description && <p className="text-sm text-gray-500 mt-0.5">{c.description}</p>}
                                        </div>
                                        {c.completed ? (
                                            <Badge tone="green">Completed</Badge>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant={c.joined ? "secondary" : "primary"}
                                                loading={busyId === c.id}
                                                onClick={() => toggleJoin(c)}
                                            >
                                                {c.joined ? "Leave" : "Join"}
                                            </Button>
                                        )}
                                    </div>
                                    {c.joined && (
                                        <div className="mt-3">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>{c.progress} / {c.goalTarget} {c.goalLabel}</span>
                                                <span>{c.daysLeft > 0 ? `${c.daysLeft} days left` : "Ended"}</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    )}
                                    {!c.joined && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            {c.goalTarget} {c.goalLabel} · {c.daysLeft > 0 ? `${c.daysLeft} days left` : "Ended"} · {c.participantCount} joined
                                        </p>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )
            )}

            {tab === "badges" && (
                !achievements ? (
                    <PageLoading />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {achievements.items.map((a) => (
                            <Card key={a.key} padded className={`flex items-start gap-3 ${a.earnedAt ? "" : "opacity-50"}`}>
                                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-xl shrink-0">
                                    {a.earnedAt ? a.icon : <LuLock className="text-gray-400 text-base" />}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-gray-800 text-sm">{a.title}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                                    {a.earnedAt && (
                                        <p className="text-[11px] text-primary mt-1 flex items-center gap-1">
                                            <LuTrophy /> Earned {new Date(a.earnedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                        </p>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
