"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/pricing";
import { PageHeader, PageLoading, Card, Badge, statusTone } from "@/components/ui";

interface PaymentRow {
    id: string;
    amount: number;
    currency: string;
    status: string;
    planType: string;
    provider: string;
    providerPaymentId: string | null;
    createdAt: string;
}

interface Subscription {
    planType: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    startDate: string;
    renewalDate: string;
    recurring: boolean;
}

interface SessionBalance {
    used: number;
    remaining: number;
    perCycle: number;
    cycleEnd: string;
}

const PLAN_LABEL: Record<string, string> = {
    EVERYDAY_YOGA: "Everyday Yoga",
    YOGA_THERAPY: "Yoga Therapy",
    STARTER: "Starter",
    FAMILY: "Family",
    TRIAL: "Free Trial",
};

type Intent = "cancel" | "pause" | "downgrade";

export default function BillingPage() {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [credits, setCredits] = useState(0);
    const [sessionCredits, setSessionCredits] = useState<SessionBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<"" | Intent | "resume">("");
    const [showManage, setShowManage] = useState(false);
    const [banner, setBanner] = useState<{ tone: "info" | "error"; text: string; manageUrl?: string } | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/billing");
            if (!res.ok) throw new Error("Failed to load billing");
            const data = await res.json();
            setSubscription(data.subscription);
            setPayments(data.payments || []);
            setCredits(data.credits || 0);
            setSessionCredits(data.sessionCredits || null);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const runIntent = async (intent: Intent) => {
        setBusy(intent);
        setBanner(null);
        try {
            const res = await fetch("/api/billing/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ intent }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setBanner({ tone: "error", text: data.error || "Something went wrong." });
                return;
            }
            // A store-billed (Apple/Google) subscription can't be changed here —
            // the API deliberately did nothing. Show that plainly instead of
            // reloading as if the action succeeded.
            if (data.storeManaged) {
                setBanner({ tone: "info", text: data.message, manageUrl: data.manageUrl });
                setShowManage(false);
                return;
            }
            setBanner({ tone: "info", text: data.message });
            setShowManage(false);
            await load();
        } catch {
            setBanner({ tone: "error", text: "Something went wrong. Please try again." });
        } finally {
            setBusy("");
        }
    };

    const resume = async () => {
        setBusy("resume");
        setBanner(null);
        try {
            const res = await fetch("/api/billing/resume", { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setBanner({ tone: "error", text: data.error || "Could not resume." });
                return;
            }
            setBanner({ tone: "info", text: data.message });
            await load();
        } finally {
            setBusy("");
        }
    };

    if (loading) return <PageLoading title="Plan & Billing" />;

    const isPaused = subscription?.status === "PAUSED";
    const canManage = subscription && subscription.status !== "CANCELLED" && !isPaused && subscription.amount > 0;
    const canDowngrade = subscription?.planType === "EVERYDAY_YOGA";
    const whatsAtStake = [
        credits > 0 ? `${credits} 1:1 session credit${credits === 1 ? "" : "s"}` : null,
        sessionCredits && sessionCredits.remaining > 0 ? `${sessionCredits.remaining} class credit${sessionCredits.remaining === 1 ? "" : "s"} this cycle` : null,
    ].filter(Boolean).join(" and ");

    return (
        <div>
            <PageHeader title="Plan & Billing" subtitle="Your subscription, renewals and payment history." />

            {banner && (
                <div className={`mb-5 p-3 rounded-xl text-sm ${banner.tone === "error" ? "bg-red-50 text-red-600 border border-red-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                    {banner.text}
                    {banner.manageUrl && (
                        <a href={banner.manageUrl} target="_blank" rel="noreferrer" className="ml-2 font-semibold underline">
                            Manage in store
                        </a>
                    )}
                </div>
            )}

            <Card padded className="mb-8">
                {subscription ? (
                    <>
                        <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
                            <div>
                                <h3 className="font-serif text-xl text-gray-800">
                                    {PLAN_LABEL[subscription.planType] || subscription.planType}
                                </h3>
                                <p className="text-gray-500 text-sm mt-0.5">
                                    {subscription.amount > 0
                                        ? `${formatPrice(subscription.amount, subscription.currency)} / month`
                                        : "No charge"}
                                </p>
                                <p className="text-gray-400 text-xs mt-1">
                                    {subscription.status === "CANCELLED" || isPaused
                                        ? "Access until"
                                        : subscription.recurring
                                            ? "Auto-renews"
                                            : "Renew by"}{" "}
                                    {new Date(subscription.renewalDate).toLocaleDateString()}
                                </p>
                            </div>
                            <Badge tone={statusTone(subscription.status)}>{subscription.status}</Badge>
                        </div>

                        {(credits > 0 || sessionCredits) && (
                            <div className="text-sm text-gray-500 mb-5 space-y-1">
                                {credits > 0 && (
                                    <p>1:1 session credits remaining: <strong className="text-gray-800">{credits}</strong></p>
                                )}
                                {sessionCredits && (
                                    <p>
                                        Classes this cycle: <strong className="text-gray-800">{sessionCredits.remaining} / {sessionCredits.perCycle}</strong> remaining
                                        {" "}(resets {new Date(sessionCredits.cycleEnd).toLocaleDateString()})
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/programs"
                                className="px-5 py-2.5 rounded-full bg-secondary text-white text-sm font-semibold hover:bg-primary transition-colors"
                            >
                                Change plan
                            </Link>
                            {isPaused && (
                                <button
                                    onClick={resume}
                                    disabled={busy === "resume"}
                                    className="px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                                >
                                    {busy === "resume" ? "Resuming…" : "Resume"}
                                </button>
                            )}
                            {canManage && (
                                <button
                                    onClick={() => setShowManage(true)}
                                    className="px-5 py-2.5 rounded-full border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
                                >
                                    Pause or cancel
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-6">
                        <p className="text-gray-500 mb-4">You don&rsquo;t have an active plan.</p>
                        <Link
                            href="/programs"
                            className="inline-flex px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                        >
                            View plans
                        </Link>
                    </div>
                )}
            </Card>

            {showManage && subscription && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => !busy && setShowManage(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="font-serif text-xl text-gray-800 mb-2">Manage your subscription</h2>
                        <p className="text-sm text-gray-500 mb-5">
                            {whatsAtStake
                                ? `You currently have ${whatsAtStake} — here's what happens to them with each option.`
                                : "Choose what you'd like to do."}
                        </p>

                        <div className="space-y-3">
                            <div className="p-4 rounded-xl border border-gray-100">
                                <p className="font-semibold text-gray-800 text-sm">Pause</p>
                                <p className="text-xs text-gray-500 mt-0.5 mb-2">
                                    Keep everything as-is until {new Date(subscription.renewalDate).toLocaleDateString()}, then resume any time before that date with one tap — nothing is lost.
                                </p>
                                <button
                                    onClick={() => runIntent("pause")}
                                    disabled={busy !== ""}
                                    className="text-sm font-semibold text-primary hover:text-primary/80 disabled:opacity-60"
                                >
                                    {busy === "pause" ? "Pausing…" : "Pause my plan"}
                                </button>
                            </div>

                            {canDowngrade && (
                                <div className="p-4 rounded-xl border border-gray-100">
                                    <p className="font-semibold text-gray-800 text-sm">Downgrade to Starter</p>
                                    <p className="text-xs text-gray-500 mt-0.5 mb-2">
                                        Takes effect at your next renewal — you keep full Everyday access until then.
                                    </p>
                                    <button
                                        onClick={() => runIntent("downgrade")}
                                        disabled={busy !== ""}
                                        className="text-sm font-semibold text-primary hover:text-primary/80 disabled:opacity-60"
                                    >
                                        {busy === "downgrade" ? "Scheduling…" : "Downgrade at renewal"}
                                    </button>
                                </div>
                            )}

                            <div className="p-4 rounded-xl border border-red-100 bg-red-50/40">
                                <p className="font-semibold text-red-700 text-sm">Cancel</p>
                                <p className="text-xs text-red-500/80 mt-0.5 mb-2">
                                    {whatsAtStake ? `You'll lose ${whatsAtStake} when access ends on ${new Date(subscription.renewalDate).toLocaleDateString()}. ` : ""}
                                    You keep access until then, but auto-renewal stops for good — consider Pause instead if you might come back.
                                </p>
                                <button
                                    onClick={() => runIntent("cancel")}
                                    disabled={busy !== ""}
                                    className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                                >
                                    {busy === "cancel" ? "Cancelling…" : "Cancel my plan"}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowManage(false)}
                            disabled={busy !== ""}
                            className="mt-5 text-sm text-gray-500 hover:text-gray-700"
                        >
                            Never mind
                        </button>
                    </div>
                </div>
            )}

            <h3 className="font-bold text-gray-800 mb-3">Payment history</h3>
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/70 text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Plan</th>
                                <th className="px-4 py-3">Amount</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">No payments yet.</td>
                                </tr>
                            ) : (
                                payments.map((p) => (
                                    <tr key={p.id} className="text-gray-600">
                                        <td className="px-4 py-3">{new Date(p.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">{PLAN_LABEL[p.planType] || p.planType}</td>
                                        <td className="px-4 py-3">{formatPrice(p.amount, p.currency)}</td>
                                        <td className="px-4 py-3"><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-400">
                                            {p.status === "PAID" ? (
                                                <Link href={`/dashboard/billing/invoice/${p.id}`} className="text-primary font-semibold not-italic hover:underline font-sans">
                                                    Invoice
                                                </Link>
                                            ) : (
                                                p.providerPaymentId || "—"
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
