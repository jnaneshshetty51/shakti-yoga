"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import { PageHeader, PageLoading, StatusBadge, TableActions } from "@/components/admin/ui";

type Invoice = {
    id: string; number: string; member: string; email: string;
    amountInr: number; taxInr: number; status: string; issuedAt: string;
    [k: string]: unknown;
};

const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const d = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function InvoicesPage() {
    const [rows, setRows] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/invoices");
            if (res.ok) setRows((await res.json()).invoices || []);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    if (loading) return <PageLoading title="Invoices" />;

    return (
        <div>
            <PageHeader title="Invoices" subtitle="Auto-issued on every successful payment. Download a copy here." />
            <DTable
                data={rows}
                columns={[
                    { header: "Number", accessor: "number", className: "font-mono text-sm" },
                    { header: "Member", accessor: (i: Invoice) => (
                        <div><div className="font-medium">{i.member}</div><div className="text-xs text-gray-400">{i.email}</div></div>
                    ) },
                    { header: "Amount", accessor: (i: Invoice) => money(i.amountInr) },
                    { header: "Status", accessor: (i: Invoice) => <StatusBadge status={i.status} /> },
                    { header: "Issued", accessor: (i: Invoice) => d(i.issuedAt) },
                ]}
                title="Invoices"
                actions={(i: Invoice) => (
                    <TableActions>
                        <a href={`/api/admin/invoices/${i.id}`} target="_blank" rel="noreferrer"
                            className="text-xs font-semibold text-brand hover:text-brand-strong">Download</a>
                    </TableActions>
                )}
            />
        </div>
    );
}
