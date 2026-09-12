"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues, type FieldDef } from "@/components/admin/EntityFormModal";
import { PageHeader, PageLoading, StatusBadge, TableActions, ActionButton } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

type FAQ = {
    id: string; question: string; answer: string; category: string; sortOrder: number; status: string;
    [key: string]: unknown;
};

const STATUS_OPTIONS = [
    { label: "Draft", value: "DRAFT" },
    { label: "Published", value: "PUBLISHED" },
    { label: "Archived", value: "ARCHIVED" },
];

const FIELDS: FieldDef[] = [
    { name: "question", label: "Question", required: true },
    { name: "answer", label: "Answer", type: "textarea", required: true },
    { name: "category", label: "Category", placeholder: "General, Pricing, Classes, Technical" },
    { name: "sortOrder", label: "Sort order (lower first)", type: "number" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
];

export default function AdminFaqsPage() {
    const { showToast } = useToast();
    const [rows, setRows] = useState<FAQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<{ mode: "create" | "edit"; row?: FAQ } | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/faqs");
            if (res.ok) setRows((await res.json()).faqs || []);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const save = async (values: EntityValues) => {
        const res = await fetch("/api/admin/faqs", {
            method: modal?.mode === "edit" ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...values, id: modal?.row?.id }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
        setModal(null);
        showToast("success", "FAQ saved.");
        load();
    };

    const remove = async (f: FAQ) => {
        if (!confirm("Delete this FAQ?")) return;
        await fetch(`/api/admin/faqs?id=${f.id}`, { method: "DELETE" });
        load();
    };

    if (loading) return <PageLoading title="FAQ" />;

    return (
        <div>
            <PageHeader title="FAQ Knowledge Base" subtitle="Frequently asked questions published across the public website and mobile apps." />
            <DTable
                data={rows}
                columns={[
                    { header: "Question", accessor: "question", className: "font-medium max-w-md" },
                    { header: "Category", accessor: "category" },
                    { header: "Order", accessor: "sortOrder" },
                    { header: "Status", accessor: (f: FAQ) => <StatusBadge status={f.status} /> },
                ]}
                title="FAQs"
                onCreate={() => setModal({ mode: "create" })}
                actions={(f: FAQ) => (
                    <TableActions>
                        <ActionButton onClick={() => setModal({ mode: "edit", row: f })}>Edit</ActionButton>
                        <ActionButton tone="danger" onClick={() => remove(f)}>Delete</ActionButton>
                    </TableActions>
                )}
            />

            {modal && (
                <EntityFormModal
                    title={modal.mode === "create" ? "New FAQ" : "Edit FAQ"}
                    submitLabel={modal.mode === "create" ? "Create" : "Save"}
                    fields={FIELDS}
                    initial={modal.row ? {
                        question: modal.row.question, answer: modal.row.answer, category: modal.row.category,
                        sortOrder: modal.row.sortOrder, status: modal.row.status,
                    } : { category: "General", status: "DRAFT", sortOrder: 0 }}
                    onCancel={() => setModal(null)}
                    onSubmit={save}
                />
            )}
        </div>
    );
}
