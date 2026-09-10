"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, PageLoading, Card, Button, Badge, inputClass, labelClass } from "@/components/ui";
import { LuCopy, LuUserPlus } from "react-icons/lu";

interface FamilyView {
    isFamily: boolean;
    isOwner: boolean;
    code: string | null;
    seatsUsed: number;
    seatsTotal: number;
    members: { name: string; owner: boolean }[];
    ownerName?: string;
}

export default function FamilyPage() {
    const [view, setView] = useState<FamilyView | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/family");
            if (!res.ok) throw new Error("Failed to load family plan");
            setView(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const copyCode = async () => {
        if (!view?.code) return;
        try {
            await navigator.clipboard.writeText(view.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard unavailable — ignore */
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setJoining(true);
        try {
            const res = await fetch("/api/family/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: joinCode }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Could not join");
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not join");
        } finally {
            setJoining(false);
        }
    };

    if (loading) return <PageLoading title="Family Membership" />;
    if (!view) return null;

    return (
        <div>
            <PageHeader title="Family Membership" subtitle="Share your plan with the people you practice with." />

            {!view.isFamily ? (
                <Card padded>
                    <p className="text-gray-500 mb-4">
                        You&rsquo;re not on a Family plan yet. Switch to Family to add seats for people in your household, or
                        redeem an invite code from a family member below.
                    </p>
                    <div className="flex flex-wrap gap-3 mb-6">
                        <Link href="/programs" className="inline-flex px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
                            View Family plan
                        </Link>
                    </div>
                    <form onSubmit={handleJoin} className="max-w-sm">
                        <label className={labelClass}>Have an invite code?</label>
                        <div className="flex gap-2">
                            <input
                                className={inputClass}
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="ABC123"
                                maxLength={6}
                            />
                            <Button type="submit" loading={joining} icon={LuUserPlus}>
                                Join
                            </Button>
                        </div>
                        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
                    </form>
                </Card>
            ) : view.isOwner ? (
                <>
                    <Card padded className="mb-6">
                        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                            <div>
                                <h3 className="font-serif text-xl text-gray-800">Your family plan</h3>
                                <p className="text-gray-500 text-sm mt-0.5">
                                    {view.seatsUsed} of {view.seatsTotal} seats used
                                </p>
                            </div>
                            <Badge tone="green">Owner</Badge>
                        </div>

                        {view.code && (
                            <>
                                <p className="text-sm text-gray-500 mb-2">Invite code — share it with family members</p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="font-mono text-2xl font-bold text-primary tracking-wider">{view.code}</span>
                                    <Button size="sm" variant="secondary" icon={LuCopy} onClick={copyCode}>
                                        {copied ? "Copied" : "Copy code"}
                                    </Button>
                                </div>
                            </>
                        )}
                    </Card>

                    <h3 className="font-bold text-gray-800 mb-3">Members</h3>
                    <Card className="overflow-hidden">
                        <ul className="divide-y divide-gray-50">
                            {view.members.map((m, i) => (
                                <li key={i} className="px-5 py-3.5 flex items-center justify-between text-sm">
                                    <span className="text-gray-700">{m.name}</span>
                                    {m.owner && <Badge tone="gray">Owner</Badge>}
                                </li>
                            ))}
                        </ul>
                    </Card>
                </>
            ) : (
                <Card padded>
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-serif text-xl text-gray-800">You&rsquo;re on {view.ownerName}&rsquo;s family plan</h3>
                        <Badge tone="gray">Member</Badge>
                    </div>
                    <p className="text-gray-500 text-sm">
                        Your membership, classes and payments are managed alongside {view.ownerName}&rsquo;s plan. Your own
                        Yoga Therapy details and attendance stay private to you.
                    </p>
                </Card>
            )}
        </div>
    );
}
