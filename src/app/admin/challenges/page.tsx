"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues, type FieldDef } from "@/components/admin/EntityFormModal";
import { PageHeader, PageLoading, StatusBadge, TableActions, ActionButton } from "@/components/admin/ui";

type Challenge = {
    id: string; title: string; description: string; goalType: string; goalTarget: number;
    startDate: string; endDate: string; imageUrl: string; status: string; participantCount: number;
};

const GOAL_OPTIONS = [
    { label: "Classes attended", value: "CLASSES" },
    { label: "Practices completed", value: "PRACTICES" },
    { label: "Minutes practiced", value: "PRACTICE_MINUTES" },
];
const STATUS_OPTIONS = [
    { label: "Draft", value: "DRAFT" },
    { label: "Published", value: "PUBLISHED" },
    { label: "Archived", value: "ARCHIVED" },
];

const FIELDS: FieldDef[] = [
    { name: "title", label: "Title", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "goalType", label: "Goal", type: "select", required: true, options: GOAL_OPTIONS },
    { name: "goalTarget", label: "Target (number to reach)", type: "number", required: true },
    { name: "startDate", label: "Starts", type: "date", required: true },
    { name: "endDate", label: "Ends", type: "date", required: true },
    { name: "imageUrl", label: "Cover image", type: "image" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
];

export default function AdminChallengesPage() {
    const [rows, setRows] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<{ mode: "create" | "edit"; initial?: EntityValues; id?: string } | null>(null);

    const fetchRows = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/challenges");
            if (res.ok) setRows((await res.json()).challenges || []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRows(); }, [fetchRows]);

    const save = async (values: EntityValues) => {
        const res = await fetch("/api/admin/challenges", {
            method: modal?.mode === "edit" ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...values, id: modal?.id }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
        setModal(null);
        fetchRows();
    };

    const remove = async (id: string) => {
        if (!confirm("Delete this challenge?")) return;
        await fetch(`/api/admin/challenges?id=${id}`, { method: "DELETE" });
        fetchRows();
    };

    if (loading) return <PageLoading title="Challenges" />;

    return (
        <div>
            <PageHeader title="Challenges" subtitle="Time-boxed goals members opt into." />
            <DTable
                data={rows}
                columns={[
                    { header: "Title", accessor: "title", className: "font-bold" },
                    { header: "Goal", accessor: (c: Challenge) => `${c.goalTarget} ${c.goalType.replace("_", " ").toLowerCase()}` },
                    { header: "Window", accessor: (c: Challenge) => `${c.startDate} → ${c.endDate}` },
                    { header: "Joined", accessor: "participantCount" },
                    { header: "Status", accessor: (c: { status: string }) => <StatusBadge status={c.status} /> },
                ]}
                title="Challenges"
                onCreate={() => setModal({ mode: "create" })}
                actions={(c: Challenge) => (
                    <TableActions>
                        <ActionButton onClick={() => setModal({
                            mode: "edit", id: c.id, initial: {
                                title: c.title, description: c.description, goalType: c.goalType,
                                goalTarget: c.goalTarget, startDate: c.startDate, endDate: c.endDate,
                                imageUrl: c.imageUrl, status: c.status,
                            },
                        })}>Edit</ActionButton>
                        <ActionButton tone="danger" onClick={() => remove(c.id)}>Delete</ActionButton>
                    </TableActions>
                )}
            />

            {modal && (
                <EntityFormModal
                    title={modal.mode === "create" ? "New challenge" : "Edit challenge"}
                    submitLabel={modal.mode === "create" ? "Create" : "Save"}
                    fields={FIELDS}
                    initial={modal.initial}
                    onCancel={() => setModal(null)}
                    onSubmit={save}
                    uploadImage={async (file) => {
                        const fd = new FormData();
                        fd.append("kind", "challenge");
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
