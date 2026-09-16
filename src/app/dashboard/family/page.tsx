"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, PageLoading, Card, Button, Badge, ErrorState, inputClass, labelClass } from "@/components/ui";
import { LuCopy, LuUserPlus } from "react-icons/lu";

interface FamilyView {
    isFamily: boolean;
    isOwner: boolean;
    code: string | null;
    seatsUsed: number;
    seatsTotal: number;
    members: { id?: string; name: string; owner: boolean }[];
    ownerName?: string;
}

export default function FamilyPage() {
    const [view, setView] = useState<FamilyView | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [leaving, setLeaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/family");
            if (!res.ok) throw new Error("Failed to load family plan");
            setView(await res.json());
            setLoadError(null);
        } catch (err) {
            console.error(err);
            setLoadError("Could not load your family plan.");
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
            window.location.reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not join");
        } finally {
            setJoining(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm("Are you sure you want to remove this member from your family plan?")) return;
        setRemovingId(memberId);
        try {
            const res = await fetch("/api/family/remove", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to remove member");
            await load();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to remove member");
        } finally {
            setRemovingId(null);
        }
    };

    const handleLeaveFamily = async () => {
        if (!confirm("Are you sure you want to leave this family plan? You will revert to a free account.")) return;
        setLeaving(true);
        try {
            const res = await fetch("/api/family/leave", { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to leave family plan");
            window.location.reload();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to leave family plan");
            setLeaving(false);
        }
    };

    if (loading) return <PageLoading title="Family Membership" />;
    if (loadError && !view) return <ErrorState message={loadError} onRetry={load} />;
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
                        <label htmlFor="family-inviteCode" className={labelClass}>Have an invite code?</label>
                        <div className="flex gap-2">
                            <input
                                id="family-inviteCode"
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

                        {view.seatsUsed >= view.seatsTotal ? (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                All seats are taken — the invite code won&rsquo;t work for anyone new until a seat frees up.
                            </p>
                        ) : view.code && (
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
                                <li key={m.id ?? i} className="px-5 py-3.5 flex items-center justify-between text-sm">
                                    <span className="text-gray-700 font-medium">{m.name}</span>
                                    <div className="flex items-center gap-2">
                                        {m.owner ? (
                                            <Badge tone="green">Owner</Badge>
                                        ) : (
                                            m.id && (
                                                <button
                                                    type="button"
                                                    disabled={removingId === m.id}
                                                    onClick={() => handleRemoveMember(m.id!)}
                                                    className="text-xs text-red-600 hover:text-red-700 font-medium px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                                >
                                                    {removingId === m.id ? "Removing..." : "Remove"}
                                                </button>
                                            )
                                        )}
                                    </div>
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
                    <p className="text-gray-500 text-sm mb-6">
                        Your membership, classes and payments are managed alongside {view.ownerName}&rsquo;s plan. Your own
                        Yoga Therapy details and attendance stay private to you.
                    </p>
                    <Button
                        variant="secondary"
                        loading={leaving}
                        onClick={handleLeaveFamily}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-sm"
                    >
                        Leave Family Plan
                    </Button>
                </Card>
            )}
        </div>
    );
}
