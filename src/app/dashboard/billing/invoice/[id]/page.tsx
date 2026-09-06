"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

interface Invoice {
    number: string;
    date: string;
    billedTo: { name: string; email: string };
    lineItem: string;
    amount: number;
    currency: string;
    reference: string;
    provider: string;
}

function money(amount: number, currency: string) {
    try {
        return new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
    } catch {
        return `${currency} ${amount.toFixed(2)}`;
    }
}

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/billing/invoice/${id}`)
            .then(async (r) => {
                const d = await r.json();
                if (!r.ok) throw new Error(d.error || "Could not load invoice");
                setInvoice(d.invoice);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="p-20 text-center text-text/50">Loading invoice…</div>;
    if (error || !invoice) {
        return (
            <div className="max-w-2xl mx-auto p-8 text-center">
                <p className="text-text/60 mb-4">{error || "Invoice not found."}</p>
                <Link href="/dashboard/billing" className="text-primary font-bold hover:underline">← Back to Billing</Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-primary/10 print:shadow-none print:border-0">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="font-serif text-2xl text-primary mb-2">Shakti Yoga Kendra</h1>
                    <p className="text-sm text-gray-500">LIG 77, Hudco 4th Main Rd, Doddangudde, Udupi, Karnataka 576102</p>
                    <p className="text-sm text-gray-500">contactus@shaktiyoga.in</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-800">INVOICE</h2>
                    <p className="text-sm text-gray-500">{invoice.number}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Bill To</h3>
                    <p className="font-medium">{invoice.billedTo.name}</p>
                    <p className="text-sm text-gray-600">{invoice.billedTo.email}</p>
                </div>
                <div className="text-right">
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Date</h3>
                    <p className="font-medium">
                        {new Date(invoice.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                </div>
            </div>

            <table className="w-full mb-8">
                <thead>
                    <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 text-xs font-bold uppercase text-gray-500">Description</th>
                        <th className="text-right py-3 text-xs font-bold uppercase text-gray-500">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    <tr>
                        <td className="py-4">{invoice.lineItem}</td>
                        <td className="py-4 text-right font-medium">{money(invoice.amount, invoice.currency)}</td>
                    </tr>
                </tbody>
                <tfoot className="border-t-2 border-gray-200">
                    <tr>
                        <td className="py-4 font-bold">Total paid</td>
                        <td className="py-4 text-right font-bold text-lg">{money(invoice.amount, invoice.currency)}</td>
                    </tr>
                </tfoot>
            </table>

            <p className="text-xs text-gray-400 mb-8">
                Paid via {invoice.provider} · Reference {invoice.reference}
            </p>

            <div className="flex justify-between items-center print:hidden">
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-primary text-white text-sm font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors"
                >
                    Print / Save PDF
                </button>
                <Link href="/dashboard/billing" className="text-sm text-gray-500 hover:text-primary transition-colors">
                    ← Back to Billing
                </Link>
            </div>
        </div>
    );
}
