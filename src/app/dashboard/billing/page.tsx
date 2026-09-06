"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/pricing";

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
    TRIAL: "Free Trial",
};

function statusColor(status: string) {
    switch (status) {
        case "ACTIVE":
        case "PAID":
            return "bg-green-100 text-green-800";
        case "TRIAL":
            return "bg-blue-100 text-blue-800";
        case "CANCELLED":
        case "FAILED":
            return "bg-red-100 text-red-700";
        default:
            return "bg-gray-100 text-gray-700";
    }
}

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

    if (loading) {
        return <div className="p-20 text-center text-text/60">Loading billing...</div>;
    }

    return (
        <div>
            <h1 className="font-serif text-3xl text-primary mb-8">Plan & Billing</h1>

            <div className="bg-white p-8 rounded-lg shadow-sm border border-primary/10 mb-8">
                {subscription ? (
                    <>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-serif text-xl text-text mb-2">
                                    {PLAN_LABEL[subscription.planType] || subscription.planType}
                                </h3>
                                <p className="text-text/70 text-sm">
                                    {subscription.amount > 0
                                        ? `${formatPrice(subscription.amount, subscription.currency)} / month`
                                        : "No charge"}
                                </p>
                                <p className="text-text/50 text-xs mt-1">
                                    {subscription.status === "CANCELLED"
                                        ? "Access until"
                                        : subscription.recurring
                                            ? "Auto-renews"
                                            : "Renew by"}{" "}
                                    {new Date(subscription.renewalDate).toLocaleDateString()}
                                </p>
                            </div>
                            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded ${statusColor(subscription.status)}`}>
                                {subscription.status}
                            </span>
                        </div>

                        {credits > 0 && (
                            <p className="text-sm text-text/70 mb-6">1:1 session credits remaining: <strong>{credits}</strong></p>
                        )}

                        <div className="flex gap-4">
                            <Link
                                href="/programs"
                                className="px-4 py-2 bg-secondary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors"
                            >
                                Change Plan
                            </Link>
                            {subscription.status !== "CANCELLED" && subscription.amount > 0 && (
                                <button
                                    onClick={handleCancel}
                                    disabled={cancelling}
                                    className="px-4 py-2 border border-red-200 text-red-500 text-xs font-bold uppercase tracking-widest rounded hover:bg-red-50 transition-colors disabled:opacity-60"
                                >
                                    {cancelling ? "Cancelling..." : "Cancel Subscription"}
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-6">
                        <p className="text-text/70 mb-4">You don&apos;t have an active plan.</p>
                        <Link
                            href="/programs"
                            className="inline-block px-6 py-3 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors"
                        >
                            View Plans
                        </Link>
                    </div>
                )}
            </div>

            <h3 className="font-serif text-xl text-primary mb-4">Payment History</h3>
            <div className="bg-white rounded-lg shadow-sm border border-primary/10 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-accent/30 text-text/70 font-bold uppercase tracking-wider">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Plan</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Reference</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {payments.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400">No payments yet.</td>
                            </tr>
                        ) : (
                            payments.map((p) => (
                                <tr key={p.id}>
                                    <td className="p-4">{new Date(p.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4">{PLAN_LABEL[p.planType] || p.planType}</td>
                                    <td className="p-4">{formatPrice(p.amount, p.currency)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded ${statusColor(p.status)}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-text/50 font-mono text-xs">
                                        {p.status === "PAID" ? (
                                            <Link href={`/dashboard/billing/invoice/${p.id}`} className="text-primary font-bold not-italic hover:underline">
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
        </div>
    );
}
