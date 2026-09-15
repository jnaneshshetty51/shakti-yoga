"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues, type FieldDef } from "@/components/admin/EntityFormModal";
import { PageHeader, PageLoading, Button, StatusBadge, TableActions, ActionButton, useConfirmDialog } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

export type Booking = {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    type: string;
    rawType: string;
    date: string;
    time: string;
    dateISO: string;
    status: string;
    rawStatus: string;
    teacher: string;
    teacherId: string;
    meetingLink?: string;
    notes?: string;
    [key: string]: unknown;
};
type Teacher = { id: string; name: string };

const STATUS_OPTIONS = [
    { label: "Pending", value: "PENDING" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" },
    { label: "No Show", value: "NO_SHOW" },
];
const TYPE_OPTIONS = [
    { label: "Therapy session", value: "THERAPY_SESSION" },
    { label: "Consultation", value: "CONSULTATION" },
    { label: "Special session", value: "SPECIAL_SESSION" },
];

const STATUS_FILTER = STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value }));

const PAGE_SIZE = 25;

export function AdminBookingsContent({ embedded = false }: { embedded?: boolean } = {}) {
    const { showToast } = useToast();
    const { confirm, dialog } = useConfirmDialog();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Booking | null>(null);
    const [creating, setCreating] = useState(false);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const fetchBookings = useCallback(async () => {
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
            if (search) params.set("q", search);
            if (statusFilter) params.set("status", statusFilter);
            const response = await fetch(`/api/admin/bookings?${params}`);
            if (response.ok) {
                const data = await response.json();
                setBookings(data.bookings || []);
                setTeachers(data.teachers || []);
                setTotalCount(data.totalCount ?? 0);
            }
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const teacherOptions = teachers.map((t) => ({ label: t.name, value: t.id }));

    const columns = [
        { header: "User", accessor: (b: Booking) => (
            <div><div className="font-bold text-gray-800">{b.userName}</div>
                <div className="text-xs text-gray-400">{b.userEmail}</div></div>
        ) },
        { header: "Type", accessor: "type" as keyof Booking },
        { header: "When", accessor: (b: Booking) => `${b.date} · ${b.time}` },
        { header: "Teacher", accessor: "teacher" as keyof Booking },
        { header: "Status", accessor: (b: Booking) => <StatusBadge status={b.status} /> },
    ];

    const submitEdit = async (values: EntityValues) => {
        const res = await fetch("/api/admin/bookings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: editing?.id,
                status: values.status,
                notes: values.notes,
                meetingLink: values.meetingLink,
                teacherId: values.teacherId || undefined,
                dateStr: values.dateStr || undefined,
                slot: values.slot || undefined,
            }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Update failed");
        setEditing(null);
        showToast("success", "Booking updated.");
        fetchBookings();
    };

    const create = async (values: EntityValues) => {
        const res = await fetch("/api/admin/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: values.email,
                teacherId: values.teacherId,
                type: values.type,
                dateStr: values.dateStr,
                slot: values.slot,
                chargeCredit: values.chargeCredit === true || values.chargeCredit === "true",
                notes: values.notes,
            }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not create");
        setCreating(false);
        showToast("success", "Booking created.");
        fetchBookings();
    };

    const quickCancel = async (bk: Booking) => {
        const ok = await confirm({
            title: `Cancel ${bk.userName}'s ${bk.type} booking?`,
            message: "Refunds any eligible credit and keeps the record.",
            confirmLabel: "Cancel booking",
            tone: "danger",
        });
        if (!ok) return;
        const res = await fetch("/api/admin/bookings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: bk.id, status: "CANCELLED" }),
        });
        if (!res.ok) {
            showToast("error", (await res.json().catch(() => ({}))).error || "Could not cancel booking");
            return;
        }
        showToast("success", "Booking cancelled.");
        fetchBookings();
    };

    const handleDelete = async (bk: Booking) => {
        const ok = await confirm({
            title: `Delete ${bk.userName}'s ${bk.type} booking?`,
            message: "Prefer Cancel to refund the credit.",
            confirmLabel: "Delete",
            tone: "danger",
        });
        if (!ok) return;
        const res = await fetch(`/api/admin/bookings?id=${bk.id}`, { method: "DELETE" });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast("error", data.error || "Could not delete booking.");
            return;
        }
        showToast("success", "Booking deleted.");
        // Removing the last row on a page beyond the first would otherwise
        // leave the admin looking at a page that no longer exists.
        if (bookings.length === 1 && page > 1) setPage((p) => p - 1);
        else fetchBookings();
    };

    const bulkCancel = async (ids: string[]) => {
        const ok = await confirm({
            title: `Cancel ${ids.length} booking(s)?`,
            message: "Refunds any eligible credit.",
            confirmLabel: "Cancel bookings",
            tone: "danger",
        });
        if (!ok) return;
        const results = await Promise.all(
            ids.map((id) =>
                fetch("/api/admin/bookings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, status: "CANCELLED" }),
                }),
            ),
        );
        const failed = results.filter((r) => !r.ok).length;
        showToast(failed ? "warning" : "success", failed ? `${failed} of ${ids.length} could not be cancelled` : `${ids.length} booking(s) cancelled`);
        fetchBookings();
    };

    if (loading) return <PageLoading title="Bookings" />;

    const editFields: FieldDef[] = [
        { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTIONS },
        { name: "teacherId", label: "Teacher", type: "select", options: teacherOptions },
        { name: "dateStr", label: "Reschedule to date (IST)", type: "date" },
        { name: "slot", label: "…time (HH:MM, 24h)", type: "text" },
        { name: "meetingLink", label: "Google Meet link", type: "text" },
        { name: "notes", label: "Session notes", type: "textarea" },
    ];

    return (
        <div>
            {dialog}
            {embedded ? (
                <div className="flex justify-end mb-4">
                    <Button onClick={() => setCreating(true)}>New booking</Button>
                </div>
            ) : (
                <PageHeader
                    title="Bookings"
                    subtitle="1:1 therapy sessions and consultations. Reschedule, reassign the teacher, or create one for a member."
                >
                    <Button onClick={() => setCreating(true)}>New booking</Button>
                </PageHeader>
            )}

            <DTable
                data={bookings}
                columns={columns}
                title="All Bookings"
                filters={[{ key: "status", label: "Status", options: STATUS_FILTER }]}
                enableBulkActions
                bulkActions={[{ label: "Cancel selected", tone: "danger", onClick: bulkCancel }]}
                server={{
                    page,
                    pageSize: PAGE_SIZE,
                    totalCount,
                    onPageChange: setPage,
                    onSearchChange: (q) => { setSearch(q); setPage(1); },
                    onFilterChange: (key, value) => {
                        if (key === "status") setStatusFilter(value);
                        setPage(1);
                    },
                }}
                actions={(bk) => (
                    <TableActions>
                        <ActionButton onClick={() => setEditing(bk)}>Edit</ActionButton>
                        {bk.rawStatus !== "CANCELLED" && bk.rawStatus !== "COMPLETED" && (
                            <ActionButton onClick={() => quickCancel(bk)}>Cancel</ActionButton>
                        )}
                        <ActionButton tone="danger" onClick={() => handleDelete(bk)}>Delete</ActionButton>
                    </TableActions>
                )}
            />

            {editing && (
                <EntityFormModal
                    title={`${editing.userName} — ${editing.type}`}
                    onCancel={() => setEditing(null)}
                    onSubmit={submitEdit}
                    fields={editFields}
                    initial={{
                        status: editing.rawStatus,
                        teacherId: editing.teacherId,
                        meetingLink: editing.meetingLink ?? "",
                        notes: editing.notes ?? "",
                    }}
                />
            )}

            {creating && (
                <EntityFormModal
                    title="New booking"
                    submitLabel="Create"
                    onCancel={() => setCreating(false)}
                    onSubmit={create}
                    fields={[
                        { name: "email", label: "Member email", type: "email", required: true },
                        { name: "teacherId", label: "Teacher", type: "select", required: true, options: teacherOptions },
                        { name: "type", label: "Type", type: "select", required: true, options: TYPE_OPTIONS },
                        { name: "dateStr", label: "Date (IST)", type: "date", required: true },
                        { name: "slot", label: "Time (HH:MM, 24h)", type: "text", required: true },
                        { name: "chargeCredit", label: "Charge a 1:1 credit", type: "checkbox" },
                        { name: "notes", label: "Notes", type: "textarea" },
                    ]}
                    initial={{ type: "THERAPY_SESSION" }}
                />
            )}
        </div>
    );
}

export default function AdminBookingsPage() {
    return <AdminBookingsContent />;
}
