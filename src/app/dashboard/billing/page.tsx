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
    startDate: string;
    renewalDate: string;
    recurring: boolean;
}

const PLAN_LABEL: Record<string, string> = {
    EVERYDAY_YOGA: "Everyday Yoga",
    YOGA_THERAPY: "Yoga Therapy",
    STARTER: "Starter",
    FAMILY: "Family",
    TRIAL: "Free Trial",
};

export default function BillingPage() {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [credits, setCredits] = useState(0);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/billing");
            if (!res.ok) throw new Error("Failed to load billing");
            const data = await res.json();
            setSubscription(data.subscription);
            setPayments(data.payments || []);
            setCredits(data.credits || 0);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleCancel = async () => {
        if (!confirm("Cancel your subscription? You'll keep access until the end of the current period.")) return;
        setCancelling(true);
        try {
            const res = await fetch("/api/billing/cancel", { method: "POST" });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Could not cancel");
            }
            await load();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Could not cancel");
        } finally {
            setCancelling(false);
        }
    };

    if (loading) return <PageLoading title="Plan & Billing" />;

    return (
        <div>
            <PageHeader title="Plan & Billing" subtitle="Your subscription, renewals and payment history." />

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
                                    {subscription.status === "CANCELLED"
                                        ? "Access until"
                                        : subscription.recurring
                                            ? "Auto-renews"
                                            : "Renew by"}{" "}
                                    {new Date(subscription.renewalDate).toLocaleDateString()}
                                </p>
                            </div>
                            <Badge tone={statusTone(subscription.status)}>{subscription.status}</Badge>
                        </div>

                        {credits > 0 && (
                            <p className="text-sm text-gray-500 mb-5">
                                1:1 session credits remaining: <strong className="text-gray-800">{credits}</strong>
                            </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/programs"
                                className="px-5 py-2.5 rounded-full bg-secondary text-white text-sm font-semibold hover:bg-primary transition-colors"
                            >
                                Change plan
                            </Link>
                            {subscription.status !== "CANCELLED" && subscription.amount > 0 && (
                                <button
                                    onClick={handleCancel}
                                    disabled={cancelling}
                                    className="px-5 py-2.5 rounded-full border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-60"
                                >
                                    {cancelling ? "Cancelling…" : "Cancel subscription"}
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
