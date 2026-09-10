"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, PageLoading, Card, Button, Badge } from "@/components/ui";
import { LuCopy, LuShare2, LuGift } from "react-icons/lu";

type ReferralStatus = "PENDING" | "SUCCESSFUL" | "EXPIRED" | "REVERSED";

interface ReferralRow {
    id: string;
    refereeName: string;
    status: ReferralStatus;
    rewardAmount: number;
    createdAt: string;
}

interface ReferralStats {
    code: string;
    link: string;
    message: string;
    creditBalance: number;
    referrerReward: number;
    refereeDiscount: number;
    referrals: ReferralRow[];
}

const STATUS_LABEL: Record<ReferralStatus, string> = {
    PENDING: "Pending",
    SUCCESSFUL: "Successful",
    EXPIRED: "Expired",
    REVERSED: "Reversed",
};

const STATUS_TONE: Record<ReferralStatus, "green" | "amber" | "gray" | "red"> = {
    PENDING: "amber",
    SUCCESSFUL: "green",
    EXPIRED: "gray",
    REVERSED: "red",
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

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
                subtitle={`Your friend gets ${inr(stats.refereeDiscount)} off their first membership. You get ${inr(stats.referrerReward)} Shakti credit once they join.`}
            />

            <Card padded className="mb-6">
                <div className="flex items-center gap-2 text-secondary text-xs font-semibold uppercase tracking-wider mb-1">
                    <LuGift /> Your Shakti credit
                </div>
                <div className="text-3xl font-bold text-gray-800">{inr(stats.creditBalance)}</div>
                <p className="text-sm text-gray-500 mt-1">Applied automatically at your next membership payment.</p>
            </Card>

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

            <h3 className="font-bold text-gray-800 mb-3">Your referrals</h3>
            <Card className="overflow-hidden mb-6">
                {stats.referrals.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-gray-400">
                        No referrals yet — share your code to get started.
                    </p>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/70 text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Person</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Reward</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {stats.referrals.map((r) => (
                                <tr key={r.id} className="text-gray-600">
                                    <td className="px-4 py-3">{r.refereeName}</td>
                                    <td className="px-4 py-3">
                                        <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                                        {r.status === "SUCCESSFUL" ? inr(r.rewardAmount) : r.status === "PENDING" ? "Pending" : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

            <Card padded>
                <h3 className="font-bold text-gray-800 mb-2">How it works</h3>
                <ul className="text-sm text-gray-500 space-y-1.5 list-disc pl-5">
                    <li>Share your code or link with a friend.</li>
                    <li>They create an account and, for Yoga Therapy, complete the assessment.</li>
                    <li>
                        When they pay for their first membership, they get {inr(stats.refereeDiscount)} off — and you get{" "}
                        {inr(stats.referrerReward)} Shakti credit. A free trial on its own doesn&rsquo;t count.
                    </li>
                    <li>Referrals expire if your friend hasn&rsquo;t joined within 90 days.</li>
                </ul>
            </Card>
        </div>
    );
}
