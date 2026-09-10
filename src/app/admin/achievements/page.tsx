"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Card, Button, PageLoading, inputClass, labelClass } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

type Badge = { key: string; title: string; description: string; icon: string; earnedBy: number };
type Member = { id: string; name: string; email: string; earned: string[] };
type Data = { achievements: Badge[]; totalMembers: number; member: Member | null };

export default function AchievementsPage() {
    const { showToast } = useToast();
    const [data, setData] = useState<Data | null>(null);
    const [email, setEmail] = useState("");

    const load = useCallback(async (lookup?: string) => {
        const qs = lookup ? `?email=${encodeURIComponent(lookup)}` : "";
        const res = await fetch(`/api/admin/achievements${qs}`);
        if (res.ok) setData(await res.json());
    }, []);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    useEffect(() => { load(); }, [load]);

    const lookup = () => load(email.trim());

    const toggle = async (key: string, grant: boolean) => {
        if (!data?.member) return;
        const res = await fetch("/api/admin/achievements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: data.member.email, key, grant }),
        });
        if (!res.ok) return showToast("error", (await res.json().catch(() => ({}))).error || "Failed");
        showToast("success", grant ? "Badge granted." : "Badge revoked.");
        load(data.member.email);
    };

    if (!data) return <PageLoading title="Achievements" />;

    return (
        <div>
            <PageHeader
                title="Achievements"
                subtitle="The badge catalogue is defined in code. Here you can see earn rates and grant or revoke a badge for one member."
            />

            <Card padded className="mb-6">
                <label className={labelClass}>Look up a member</label>
                <div className="flex gap-2">
                    <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="member@email.com" onKeyDown={(e) => e.key === "Enter" && lookup()} />
                    <Button onClick={lookup}>Look up</Button>
                </div>
                {email && !data.member && <p className="text-sm text-red-500 mt-2">No member with that email.</p>}
                {data.member && <p className="text-sm text-ink-muted mt-2">{data.member.name} — {data.member.earned.length}/{data.achievements.length} earned</p>}
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
                {data.achievements.map((a) => {
                    const has = data.member?.earned.includes(a.key);
                    const pct = data.totalMembers ? Math.round((a.earnedBy / data.totalMembers) * 100) : 0;
                    return (
                        <Card key={a.key} padded className="flex items-start gap-3">
                            <span className="text-2xl">{a.icon}</span>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-ink">{a.title}</p>
                                <p className="text-sm text-ink-muted">{a.description}</p>
                                <p className="text-xs text-ink-subtle mt-1 num">{a.earnedBy} members · {pct}%</p>
                            </div>
                            {data.member && (
                                <Button size="sm" variant={has ? "ghost" : "primary"} onClick={() => toggle(a.key, !has)}>
                                    {has ? "Revoke" : "Grant"}
                                </Button>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
