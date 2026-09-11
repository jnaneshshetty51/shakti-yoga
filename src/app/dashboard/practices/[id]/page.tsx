"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PageHeader, PageLoading, ErrorState, Card, Badge, Button } from "@/components/ui";
import { LuArrowLeft, LuClock, LuPlay, LuCheck, LuSparkles } from "react-icons/lu";

interface Practice {
    id: string;
    title: string;
    description: string | null;
    steps: string | null;
    category: string;
    level: "BEGINNER" | "INTERMEDIATE" | "ALL_LEVELS";
    durationMin: number;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    completed: boolean;
    completionCount: number;
}

interface Achievement { key: string; title: string; description: string; icon: string }

const LEVEL_LABEL: Record<Practice["level"], string> = {
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermediate",
    ALL_LEVELS: "All levels",
};

/** `steps` is a markdown-ish list ("- cue" / "1. cue" / one cue per line) — no markdown
 *  renderer in this codebase, so just split it into an ordered list of lines. */
function parseSteps(steps: string): string[] {
    return steps
        .split("\n")
        .map((l) => l.replace(/^\s*[-*]\s+/, "").replace(/^\s*\d+[.)]\s+/, "").trim())
        .filter(Boolean);
}

export default function PracticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [practice, setPractice] = useState<Practice | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [completing, setCompleting] = useState(false);
    const [earned, setEarned] = useState<Achievement[]>([]);

    const load = useCallback(async () => {
        setError(null);
        try {
            const res = await fetch(`/api/practices/${id}`, { cache: "no-store" });
            if (!res.ok) throw new Error(String(res.status));
            const data = await res.json();
            setPractice(data.practice);
        } catch {
            setError("Could not load this practice.");
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const complete = async () => {
        setCompleting(true);
        setEarned([]);
        try {
            const res = await fetch(`/api/practices/${id}/complete`, { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setEarned(data.earned ?? []);
                await load();
            }
        } finally {
            setCompleting(false);
        }
    };

    if (!practice && error) return <ErrorState message={error} onRetry={load} />;
    if (!practice) return <PageLoading title="Practice" />;

    const steps = practice.steps ? parseSteps(practice.steps) : [];

    return (
        <div className="max-w-2xl">
            <Link href="/dashboard/practices" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
                <LuArrowLeft /> Back to Practice
            </Link>

            {practice.thumbnailUrl && (
                <div className="relative h-52 w-full rounded-2xl overflow-hidden mb-5 bg-primary/5">
                    <Image src={practice.thumbnailUrl} alt="" fill className="object-cover" sizes="672px" />
                </div>
            )}

            <PageHeader
                title={practice.title}
                subtitle={practice.description ?? undefined}
            />

            <div className="flex items-center gap-2 -mt-4 mb-6">
                <Badge tone="gray">{LEVEL_LABEL[practice.level]}</Badge>
                <span className="text-xs text-gray-400 flex items-center gap-1"><LuClock /> {practice.durationMin} min</span>
                {practice.completionCount > 0 && (
                    <span className="text-xs text-primary flex items-center gap-1"><LuCheck /> Completed {practice.completionCount}×</span>
                )}
            </div>

            {practice.videoUrl && (
                <a
                    href={practice.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3.5 mb-6 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                    <LuPlay /> Watch the practice
                </a>
            )}

            {steps.length > 0 && (
                <Card padded className="mb-6">
                    <h3 className="font-bold text-gray-800 mb-3">Steps</h3>
                    <ol className="space-y-3">
                        {steps.map((s, i) => (
                            <li key={i} className="flex gap-3 text-sm text-gray-700">
                                <span className="w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                <span className="pt-0.5">{s}</span>
                            </li>
                        ))}
                    </ol>
                </Card>
            )}

            {earned.length > 0 && (
                <Card padded className="mb-6 bg-primary/5 border-primary/15">
                    <p className="text-sm font-semibold text-primary mb-2">New badge{earned.length > 1 ? "s" : ""} earned! 🎉</p>
                    <div className="flex flex-wrap gap-3">
                        {earned.map((a) => (
                            <div key={a.key} className="flex items-center gap-2 text-sm text-gray-700">
                                <span className="text-xl">{a.icon}</span> {a.title}
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <Button icon={practice.completed ? LuCheck : LuSparkles} loading={completing} onClick={complete} className="w-full justify-center">
                {practice.completed ? "Mark complete again" : "Mark complete"}
            </Button>
        </div>
    );
}
