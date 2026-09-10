"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, PageLoading, Card, Button } from "@/components/ui";
import { LuCopy, LuShare2, LuGift, LuUsers } from "react-icons/lu";

interface ReferralStats {
    code: string;
    link: string;
    message: string;
    invited: number;
    converted: number;
    creditDays: number;
    rewardMonths: number;
}

export default function ReferPage() {
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<"link" | "code" | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/referral");
            if (!res.ok) throw new Error("Failed to load referral stats");
            setStats(await res.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const copy = async (value: string, which: "link" | "code") => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(which);
            setTimeout(() => setCopied(null), 2000);
        } catch {
            /* clipboard unavailable — ignore */
        }
    };

    const share = async () => {
        if (!stats) return;
        if (navigator.share) {
            try {
                await navigator.share({ text: stats.message, url: stats.link });
                return;
            } catch {
                /* user cancelled or unsupported — fall through to copy */
            }
        }
        copy(stats.message, "link");
    };

    if (loading) return <PageLoading title="Refer & Earn" />;
    if (!stats) return null;

    return (
        <div>
            <PageHeader
                title="Refer & Earn"
                subtitle="Share Shakti with someone you love. When they join, you both get rewarded."
            />

            <Card padded className="mb-6">
                <p className="text-sm text-gray-500 mb-3">Your referral code</p>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-2xl font-bold text-primary tracking-wider">{stats.code}</span>
                    <Button size="sm" variant="secondary" icon={LuCopy} onClick={() => copy(stats.code, "code")}>
                        {copied === "code" ? "Copied" : "Copy code"}
                    </Button>
                </div>

                <p className="text-sm text-gray-500 mt-5 mb-2">Your share link</p>
                <div className="flex flex-wrap items-center gap-3">
                    <code className="text-xs sm:text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-gray-600 break-all">
                        {stats.link}
                    </code>
                    <Button size="sm" variant="secondary" icon={LuCopy} onClick={() => copy(stats.link, "link")}>
                        {copied === "link" ? "Copied" : "Copy link"}
                    </Button>
                    <Button size="sm" icon={LuShare2} onClick={share}>
                        Share
                    </Button>
                </div>
            </Card>

            <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <Card padded>
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                        <LuUsers /> Invited
                    </div>
                    <div className="text-3xl font-bold text-gray-800">{stats.invited}</div>
                </Card>
                <Card padded>
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                        <LuUsers /> Converted
                    </div>
                    <div className="text-3xl font-bold text-gray-800">{stats.converted}</div>
                </Card>
                <Card padded>
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                        <LuGift /> Credit earned
                    </div>
                    <div className="text-3xl font-bold text-gray-800">{stats.creditDays} days</div>
                </Card>
            </div>

            <Card padded>
                <h3 className="font-bold text-gray-800 mb-2">How it works</h3>
                <ul className="text-sm text-gray-500 space-y-1.5 list-disc pl-5">
                    <li>Share your code or link with a friend.</li>
                    <li>When they sign up with it, you&rsquo;re credited automatically.</li>
                    <li>
                        Once they take a paid plan, you get {stats.rewardMonths} month{stats.rewardMonths === 1 ? "" : "s"} of
                        credit applied to your subscription.
                    </li>
                </ul>
            </Card>
        </div>
    );
}
