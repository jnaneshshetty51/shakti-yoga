"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";
import { StatCard } from "@/components/admin/StatCard";
import {
    PageHeader, PageLoading, Tabs, Badge, StatusBadge, TableActions, ActionButton, useConfirmDialog,
} from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import { CURRENCY_OPTIONS } from "@/lib/pricing";
import { LuMessageCircle, LuCalendar, LuUsers, LuBadgeCheck } from "react-icons/lu";

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

export function AdminRetreatsContent({ embedded = false }: { embedded?: boolean } = {}) {
    const { showToast } = useToast();
    const { confirm, dialog } = useConfirmDialog();
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
        const ok = await confirm({
            title: `Delete "${r.name}"?`,
            confirmLabel: "Delete",
            tone: "danger",
        });
        if (!ok) return;
        const res = await fetch(`/api/admin/retreats/${r.id}`, { method: "DELETE" });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast("error", data.error || "Could not delete.");
            return;
        }
        showToast("success", "Deleted.");
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

    const publishedCount = retreats.filter((r) => r.status === "PUBLISHED").length;
    const confirmedCount = enquiries.filter((e) => e.status === "CONFIRMED" || e.status === "PAID").length;
    const totalParticipants = enquiries.reduce((acc, e) => acc + (e.participantsCount || 1), 0);

    const retreatColumns = [
        { header: "Name", accessor: (r: Retreat) => (
            <div><div className="font-semibold text-ink">{r.name}</div><div className="text-xs text-ink-subtle">{r.location || "—"}</div></div>
        ) },
        { header: "Kind", accessor: (r: Retreat) => <Badge tone="purple">{r.kind}</Badge> },
        { header: "Dates", accessor: (r: Retreat) => `${new Date(r.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${new Date(r.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` },
        { header: "Price", accessor: (r: Retreat) => r.price != null ? `${r.currency} ${r.price.toLocaleString("en-IN")}` : "—" },
        { header: "Status", accessor: (r: Retreat) => <StatusBadge status={r.status} /> },
        { header: "Enquiries", accessor: (r: Retreat) => (
            <span className="inline-flex items-center gap-1 font-medium text-ink">
                <LuUsers className="w-3.5 h-3.5 text-ink-subtle" />
                {r._count.enquiries}
            </span>
        ) },
    ];

    const enquiryColumns = [
        { header: "Contact", accessor: (e: Enquiry) => (
            <div>
                <div className="font-semibold text-ink">{e.name}</div>
                <div className="text-xs text-ink-subtle flex items-center gap-1.5 flex-wrap">
                    <span>{e.email}</span>
                    {e.phone && (
                        <>
                            <span>•</span>
                            <a
                                href={`https://wa.me/${e.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${e.name}, thank you for your enquiry regarding ${e.retreat.name} at Shakthi Yoga!`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                                title="Chat on WhatsApp"
                                onClick={(ev) => ev.stopPropagation()}
                            >
                                <LuMessageCircle className="w-3 h-3" />
                                <span>{e.phone}</span>
                            </a>
                        </>
                    )}
                </div>
            </div>
        ) },
        { header: "For Event", accessor: (e: Enquiry) => <span className="font-medium text-ink">{e.retreat.name}</span> },
        { header: "Participants", accessor: (e: Enquiry) => (
            <span className="inline-flex items-center gap-1 font-medium text-ink">
                <LuUsers className="w-3.5 h-3.5 text-ink-subtle" />
                {e.participantsCount}
            </span>
        ) },
        { header: "Status", accessor: (e: Enquiry) => <StatusBadge status={e.status} /> },
    ];

    return (
        <div>
            {dialog}
            {!embedded && (
                <PageHeader title="Retreats & Events" subtitle="Retreats, workshops and one-off events — enquiry to manual payment." />
            )}

            {/* Top KPI StatCards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <StatCard title="Active Retreats" value={publishedCount} suffix={`/ ${retreats.length}`} icon={<LuCalendar />} accent="terracotta" />
                <StatCard title="Total Enquiries" value={enquiries.length} icon={<LuUsers />} accent="blue" />
                <StatCard title="Confirmed / Paid" value={confirmedCount} icon={<LuBadgeCheck />} accent="green" />
                <StatCard title="Total Interested" value={totalParticipants} suffix=" guests" icon={<LuUsers />} accent="amber" />
            </div>

            <div className="mb-4">
                <Tabs
                    tabs={[
                        { key: "retreats", label: "Retreats & Events", count: retreats.length },
                        { key: "enquiries", label: "Enquiries", count: enquiries.length },
                    ]}
                    active={tab}
                    onChange={(k) => setTab(k as "retreats" | "enquiries")}
                />
            </div>

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
                            <Link href={`/admin/retreats/enquiries/${e.id}`} className="text-xs font-semibold text-brand hover:text-brand-strong">View</Link>
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
                        { name: "currency", label: "Currency", type: "select", options: CURRENCY_OPTIONS },
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

export default function AdminRetreatsPage() {
    return <AdminRetreatsContent />;
}
