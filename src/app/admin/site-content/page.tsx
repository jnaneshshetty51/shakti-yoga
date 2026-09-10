"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues, type FieldDef } from "@/components/admin/EntityFormModal";
import { PageHeader, PageLoading, Tabs, StatusBadge, TableActions, ActionButton } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

type Benefit = { id: string; icon: string; title: string; description: string; sortOrder: number; status: string; [k: string]: unknown };
type Stat = { id: string; statKey: string; statValue: string; category: string; [k: string]: unknown };
type Data = { benefits: Benefit[]; stats: Stat[] };
type TabKey = "benefits" | "stats";

const BENEFIT_FIELDS: FieldDef[] = [
    { name: "icon", label: "Icon (emoji)", placeholder: "🧘" },
    { name: "title", label: "Title", required: true },
    { name: "description", label: "Description", type: "textarea", required: true },
    { name: "sortOrder", label: "Sort order", type: "number" },
    { name: "status", label: "Status", type: "select", options: [
        { label: "Draft", value: "DRAFT" }, { label: "Published", value: "PUBLISHED" }, { label: "Archived", value: "ARCHIVED" },
    ] },
];
const STAT_FIELDS: FieldDef[] = [
    { name: "statKey", label: "Key", required: true, placeholder: "totalStudents" },
    { name: "statValue", label: "Value", required: true },
    { name: "category", label: "Category", placeholder: "general" },
];

export default function SiteContentPage() {
    const { showToast } = useToast();
    const [data, setData] = useState<Data | null>(null);
    const [tab, setTab] = useState<TabKey>("benefits");
    const [modal, setModal] = useState<{ kind: TabKey; row?: Benefit | Stat } | null>(null);

    const load = useCallback(async () => {
        const res = await fetch("/api/admin/site-content");
        if (res.ok) setData(await res.json());
    }, []);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    useEffect(() => { load(); }, [load]);

    const save = async (values: EntityValues) => {
        const kind = modal?.kind === "benefits" ? "benefit" : "stat";
        const res = await fetch("/api/admin/site-content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...values, kind, id: modal?.row?.id }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
        setModal(null);
        showToast("success", "Saved.");
        load();
    };

    const remove = async (kind: "benefit" | "stat", id: string) => {
        if (!confirm("Delete this?")) return;
        await fetch(`/api/admin/site-content?kind=${kind}&id=${id}`, { method: "DELETE" });
        load();
    };

    if (!data) return <PageLoading title="Site content" />;

    return (
        <div>
            <PageHeader title="Site content" subtitle="'Why us' benefits and the homepage stat figures." />
            <div className="mb-4">
                <Tabs
                    active={tab}
                    onChange={(k) => setTab(k)}
                    tabs={[
                        { key: "benefits", label: "Why us", count: data.benefits.length },
                        { key: "stats", label: "Stats", count: data.stats.length },
                    ]}
                />
            </div>

            {tab === "benefits" ? (
                <DTable
                    data={data.benefits}
                    columns={[
                        { header: "", accessor: (b: Benefit) => <span className="text-xl">{b.icon}</span> },
                        { header: "Title", accessor: "title", className: "font-medium" },
                        { header: "Order", accessor: "sortOrder" },
                        { header: "Status", accessor: (b: Benefit) => <StatusBadge status={b.status} /> },
                    ]}
                    title="Why-us benefits"
                    onCreate={() => setModal({ kind: "benefits" })}
                    actions={(b: Benefit) => (
                        <TableActions>
                            <ActionButton onClick={() => setModal({ kind: "benefits", row: b })}>Edit</ActionButton>
                            <ActionButton tone="danger" onClick={() => remove("benefit", b.id)}>Delete</ActionButton>
                        </TableActions>
                    )}
                />
            ) : (
                <DTable
                    data={data.stats}
                    columns={[
                        { header: "Key", accessor: "statKey", className: "font-mono text-sm" },
                        { header: "Value", accessor: "statValue" },
                        { header: "Category", accessor: "category" },
                    ]}
                    title="Homepage stats"
                    onCreate={() => setModal({ kind: "stats" })}
                    actions={(s: Stat) => (
                        <TableActions>
                            <ActionButton onClick={() => setModal({ kind: "stats", row: s })}>Edit</ActionButton>
                            <ActionButton tone="danger" onClick={() => remove("stat", s.id)}>Delete</ActionButton>
                        </TableActions>
                    )}
                />
            )}

            {modal && (
                <EntityFormModal
                    title={modal.kind === "benefits" ? "Benefit" : "Stat"}
                    fields={modal.kind === "benefits" ? BENEFIT_FIELDS : STAT_FIELDS}
                    initial={modal.row as EntityValues | undefined}
                    onCancel={() => setModal(null)}
                    onSubmit={save}
                />
            )}
        </div>
    );
}
