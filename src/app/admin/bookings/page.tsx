"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues, type FieldDef } from "@/components/admin/EntityFormModal";
import { PageHeader, PageLoading, Button, StatusBadge, TableActions, ActionButton } from "@/components/admin/ui";
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

export default function AdminBookingsPage() {
    const { showToast } = useToast();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Booking | null>(null);
    const [creating, setCreating] = useState(false);

    const fetchBookings = useCallback(async () => {
        try {
            const response = await fetch("/api/admin/bookings");
            if (response.ok) {
                const data = await response.json();
                setBookings(data.bookings || []);
                setTeachers(data.teachers || []);
            }
        } finally {
            setLoading(false);
        }
    }, []);

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

    const handleDelete = async (bk: Booking) => {
        if (!confirm(`Delete ${bk.userName}'s ${bk.type} booking? (Prefer Cancel to refund the credit.)`)) return;
        await fetch(`/api/admin/bookings?id=${bk.id}`, { method: "DELETE" });
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
            <PageHeader
                title="Bookings"
                subtitle="1:1 therapy sessions and consultations. Reschedule, reassign the teacher, or create one for a member."
            >
                <Button onClick={() => setCreating(true)}>New booking</Button>
            </PageHeader>

            <DTable
                data={bookings}
                columns={columns}
                title="All Bookings"
                filters={[{ key: "status", label: "Status", options: STATUS_FILTER }]}
                actions={(bk) => (
                    <TableActions>
                        <ActionButton onClick={() => setEditing(bk)}>Edit</ActionButton>
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
