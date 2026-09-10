"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";
import {
    PageHeader, PageLoading, Tabs, Badge, StatusBadge, TableActions, ActionButton,
} from "@/components/admin/ui";

type Retreat = {
    id: string;
    kind: "RETREAT" | "WORKSHOP" | "EVENT";
    name: string;
    location: string | null;
    startDate: string;
    endDate: string;
    description: string | null;
    capacity: number | null;
    price: number | null;
    currency: string;
    status: "DRAFT" | "PUBLISHED" | "CLOSED";
    _count: { enquiries: number };
};

type Enquiry = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    participantsCount: number;
    status: string;
    createdAt: string;
    retreat: { id: string; name: string; kind: string };
};

const KIND_OPTIONS = [
    { label: "Retreat", value: "RETREAT" },
    { label: "Workshop", value: "WORKSHOP" },
    { label: "Event", value: "EVENT" },
];
const STATUS_OPTIONS = [
    { label: "Draft", value: "DRAFT" },
    { label: "Published", value: "PUBLISHED" },
    { label: "Closed", value: "CLOSED" },
];
const ENQUIRY_STATUS_OPTIONS = [
    { label: "New", value: "NEW" },
    { label: "Contacted", value: "CONTACTED" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Paid", value: "PAID" },
    { label: "Cancelled", value: "CANCELLED" },
];

export default function AdminRetreatsPage() {
    const [tab, setTab] = useState<"retreats" | "enquiries">("retreats");
    const [retreats, setRetreats] = useState<Retreat[] | null>(null);
    const [enquiries, setEnquiries] = useState<Enquiry[] | null>(null);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<Retreat | null>(null);
    const [editingEnquiry, setEditingEnquiry] = useState<Enquiry | null>(null);

    const loadRetreats = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/retreats");
            if (res.ok) setRetreats((await res.json()).retreats || []);
        } catch {
            /* keep showing whatever we last had */
        }
    }, []);
    const loadEnquiries = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/retreats/enquiries");
            if (res.ok) setEnquiries((await res.json()).enquiries || []);
        } catch {
            /* keep showing whatever we last had */
        }
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    useEffect(() => { loadRetreats(); loadEnquiries(); }, [loadRetreats, loadEnquiries]);

    const submitRetreat = async (values: EntityValues) => {
        const isEdit = !!editing;
        const res = await fetch(isEdit ? `/api/admin/retreats/${editing!.id}` : "/api/admin/retreats", {
            method: isEdit ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Save failed");
        }
        setEditing(null); setCreating(false);
        loadRetreats();
    };

    const deleteRetreat = async (r: Retreat) => {
        if (!confirm(`Delete "${r.name}"?`)) return;
        await fetch(`/api/admin/retreats/${r.id}`, { method: "DELETE" });
        loadRetreats();
    };

    const submitEnquiryStatus = async (values: EntityValues) => {
        const res = await fetch(`/api/admin/retreats/enquiries/${editingEnquiry?.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: values.status }),
        });
        if (!res.ok) throw new Error("Update failed");
        setEditingEnquiry(null);
        loadEnquiries();
    };

    if (!retreats || !enquiries) return <PageLoading title="Retreats & Events" />;

    const retreatColumns = [
        { header: "Name", accessor: (r: Retreat) => (
            <div><div className="font-semibold text-ink">{r.name}</div><div className="text-xs text-ink-subtle">{r.location || "—"}</div></div>
        ) },
        { header: "Kind", accessor: (r: Retreat) => <Badge tone="purple">{r.kind}</Badge> },
        { header: "Dates", accessor: (r: Retreat) => `${new Date(r.startDate).toLocaleDateString("en-IN")} – ${new Date(r.endDate).toLocaleDateString("en-IN")}` },
        { header: "Status", accessor: (r: Retreat) => <StatusBadge status={r.status} /> },
        { header: "Enquiries", accessor: (r: Retreat) => r._count.enquiries },
    ];

    const enquiryColumns = [
        { header: "Contact", accessor: (e: Enquiry) => (
            <div><div className="font-semibold text-ink">{e.name}</div><div className="text-xs text-ink-subtle">{e.email}</div></div>
        ) },
        { header: "For", accessor: (e: Enquiry) => <span>{e.retreat.name}</span> },
        { header: "Participants", accessor: (e: Enquiry) => e.participantsCount },
        { header: "Status", accessor: (e: Enquiry) => <StatusBadge status={e.status} /> },
    ];

    return (
        <div>
            <PageHeader title="Retreats & Events" subtitle="Retreats, workshops and one-off events — enquiry to manual payment.">
                <Tabs
                    tabs={[
                        { key: "retreats", label: "Retreats & Events", count: retreats.length },
                        { key: "enquiries", label: "Enquiries", count: enquiries.length },
                    ]}
                    active={tab}
                    onChange={setTab}
                />
            </PageHeader>

            {tab === "retreats" ? (
                <DTable
                    data={retreats}
                    columns={retreatColumns}
                    title="Retreats & Events"
                    onCreate={() => setCreating(true)}
                    filters={[{ key: "status", label: "Status", options: STATUS_OPTIONS }]}
                    actions={(r) => (
                        <TableActions>
                            <ActionButton onClick={() => setEditing(r)}>Edit</ActionButton>
                            <ActionButton tone="danger" onClick={() => deleteRetreat(r)}>Delete</ActionButton>
                        </TableActions>
                    )}
                />
            ) : (
                <DTable
                    data={enquiries}
                    columns={enquiryColumns}
                    title="Enquiries"
                    filters={[{ key: "status", label: "Status", options: ENQUIRY_STATUS_OPTIONS }]}
                    actions={(e) => (
                        <TableActions>
                            <a href={`/admin/retreats/enquiries/${e.id}`} className="text-xs font-semibold text-brand hover:text-brand-strong">View</a>
                            <ActionButton onClick={() => setEditingEnquiry(e)}>Update status</ActionButton>
                        </TableActions>
                    )}
                />
            )}

            {(creating || editing) && (
                <EntityFormModal
                    title={editing ? `Edit ${editing.name}` : "New retreat / workshop / event"}
                    onCancel={() => { setCreating(false); setEditing(null); }}
                    onSubmit={submitRetreat}
                    fields={[
                        { name: "name", label: "Name", required: true },
                        { name: "kind", label: "Kind", type: "select", required: true, options: KIND_OPTIONS },
                        { name: "location", label: "Location" },
                        { name: "startDate", label: "Start date", type: "date", required: true },
                        { name: "endDate", label: "End date", type: "date", required: true },
                        { name: "capacity", label: "Capacity", type: "number" },
                        { name: "price", label: "Price", type: "number" },
                        { name: "currency", label: "Currency" },
                        { name: "description", label: "Description", type: "textarea" },
                        ...(editing ? [{ name: "status", label: "Status", type: "select" as const, options: STATUS_OPTIONS }] : []),
                    ]}
                    initial={editing ? {
                        name: editing.name, kind: editing.kind, location: editing.location ?? "",
                        startDate: editing.startDate.slice(0, 10), endDate: editing.endDate.slice(0, 10),
                        capacity: editing.capacity ?? "", price: editing.price ?? "", currency: editing.currency,
                        description: editing.description ?? "", status: editing.status,
                    } : { currency: "INR", kind: "RETREAT" }}
                />
            )}

            {editingEnquiry && (
                <EntityFormModal
                    title={`${editingEnquiry.name}'s enquiry`}
                    onCancel={() => setEditingEnquiry(null)}
                    onSubmit={submitEnquiryStatus}
                    fields={[{ name: "status", label: "Status", type: "select", required: true, options: ENQUIRY_STATUS_OPTIONS }]}
                    initial={{ status: editingEnquiry.status }}
                />
            )}
        </div>
    );
}
