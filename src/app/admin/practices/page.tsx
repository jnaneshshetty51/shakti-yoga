"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues, type FieldDef } from "@/components/admin/EntityFormModal";
import { PageHeader, PageLoading, StatusBadge, TableActions, ActionButton } from "@/components/admin/ui";

type Practice = {
    id: string; title: string; slug: string; description: string; steps: string;
    category: string; level: string; durationMin: number; videoUrl: string;
    thumbnailUrl: string; status: string;
};

const CATEGORY_OPTIONS = [
    "YOGA", "BREATHING", "MINDFULNESS", "MOBILITY", "SLEEP", "STRENGTH",
    "WELLNESS", "BEGINNERS", "PHILOSOPHY", "STUDIO", "COMMUNITY",
].map((v) => ({ label: v[0] + v.slice(1).toLowerCase(), value: v }));
const LEVEL_OPTIONS = [
    { label: "Beginner", value: "BEGINNER" },
    { label: "Intermediate", value: "INTERMEDIATE" },
    { label: "All levels", value: "ALL_LEVELS" },
];
const STATUS_OPTIONS = [
    { label: "Draft", value: "DRAFT" },
    { label: "Published", value: "PUBLISHED" },
    { label: "Archived", value: "ARCHIVED" },
];

const FIELDS: FieldDef[] = [
    { name: "title", label: "Title", required: true },
    { name: "slug", label: "URL slug", placeholder: "auto from title if blank" },
    { name: "category", label: "Category", type: "select", required: true, options: CATEGORY_OPTIONS },
    { name: "level", label: "Level", type: "select", options: LEVEL_OPTIONS },
    { name: "durationMin", label: "Duration (minutes)", type: "number", required: true },
    { name: "videoUrl", label: "Video URL (Instagram / YouTube)", placeholder: "opened externally" },
    { name: "thumbnailUrl", label: "Thumbnail", type: "image" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "steps", label: "Steps (markdown list)", type: "textarea" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
];

export default function AdminPracticesPage() {
    const [rows, setRows] = useState<Practice[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<{ mode: "create" | "edit"; initial?: EntityValues; id?: string } | null>(null);

    const fetchRows = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/practices");
            if (res.ok) setRows((await res.json()).practices || []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRows(); }, [fetchRows]);

    const save = async (values: EntityValues) => {
        const res = await fetch("/api/admin/practices", {
            method: modal?.mode === "edit" ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...values, id: modal?.id }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
        setModal(null);
        fetchRows();
    };

    const remove = async (id: string) => {
        if (!confirm("Delete this practice?")) return;
        await fetch(`/api/admin/practices?id=${id}`, { method: "DELETE" });
        fetchRows();
    };

    if (loading) return <PageLoading title="Practices" />;

    return (
        <div>
            <PageHeader title="Practices" subtitle="Short guided sequences members can do at home." />
            <DTable
                data={rows}
                columns={[
                    { header: "Title", accessor: "title", className: "font-bold" },
                    { header: "Category", accessor: (p: Practice) => p.category[0] + p.category.slice(1).toLowerCase() },
                    { header: "Level", accessor: (p: Practice) => p.level.replace("_", " ").toLowerCase() },
                    { header: "Min", accessor: "durationMin" },
                    { header: "Status", accessor: (p: { status: string }) => <StatusBadge status={p.status} /> },
                ]}
                title="Guided practices"
                onCreate={() => setModal({ mode: "create" })}
                actions={(p: Practice) => (
                    <TableActions>
                        <ActionButton onClick={() => setModal({
                            mode: "edit", id: p.id, initial: {
                                title: p.title, slug: p.slug, category: p.category, level: p.level,
                                durationMin: p.durationMin, videoUrl: p.videoUrl, thumbnailUrl: p.thumbnailUrl,
                                description: p.description, steps: p.steps, status: p.status,
                            },
                        })}>Edit</ActionButton>
                        <ActionButton tone="danger" onClick={() => remove(p.id)}>Delete</ActionButton>
                    </TableActions>
                )}
            />

            {modal && (
                <EntityFormModal
                    title={modal.mode === "create" ? "New practice" : "Edit practice"}
                    submitLabel={modal.mode === "create" ? "Create" : "Save"}
                    fields={FIELDS}
                    initial={modal.initial}
                    onCancel={() => setModal(null)}
                    onSubmit={save}
                    uploadImage={async (file) => {
                        const fd = new FormData();
                        fd.append("kind", "practice");
                        fd.append("file", file);
                        const res = await fetch("/api/admin/content/image", { method: "POST", body: fd });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Upload failed");
                        return data.url as string;
                    }}
                />
            )}
        </div>
    );
}
