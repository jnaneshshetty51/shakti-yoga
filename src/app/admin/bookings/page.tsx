"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";
import { PageHeader, PageLoading, StatusBadge, TableActions, ActionButton } from "@/components/admin/ui";

export type Booking = {
    id: string;
    userId: string;
    userName: string;
    type: 'Therapy' | 'Consultation' | 'Special Session';
    date: string;
    time: string;
    status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
    teacher: string;
    meetingLink?: string;
    notes?: string;
};

const STATUS_OPTIONS = [
    { label: "Pending", value: "PENDING" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" },
    { label: "No Show", value: "NO_SHOW" },
];

export default function AdminBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Booking | null>(null);

    const fetchBookings = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/bookings');
            if (response.ok) {
                const data = await response.json();
                setBookings(data.bookings || []);
            }
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const columns = [
        { header: "User", accessor: "userName" as keyof Booking, className: "font-bold text-gray-800" },
        { header: "Type", accessor: "type" as keyof Booking },
        { header: "Date", accessor: "date" as keyof Booking },
        { header: "Time", accessor: "time" as keyof Booking },
        { header: "Teacher", accessor: "teacher" as keyof Booking },
        {
            header: "Status",
            accessor: (bk: Booking) => <StatusBadge status={bk.status} />,
        },
    ];

    const submitEdit = async (values: EntityValues) => {
        const res = await fetch('/api/admin/bookings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editing?.id, status: values.status, notes: values.notes, meetingLink: values.meetingLink }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Update failed');
        }
        setEditing(null);
        fetchBookings();
    };

    const handleDelete = async (bk: Booking) => {
        if (!confirm(`Delete ${bk.userName}'s ${bk.type} booking?`)) return;
        await fetch(`/api/admin/bookings?id=${bk.id}`, { method: 'DELETE' });
        fetchBookings();
    };

    if (loading) return <PageLoading title="Bookings & Trials" />;

    return (
        <div>
            <PageHeader
                title="Bookings & Trials"
                subtitle="Manage 1:1 therapy sessions, consultations, and trial bookings."
            />

            <DTable
                data={bookings}
                columns={columns}
                title="All Bookings"
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
                    fields={[
                        { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTIONS },
                        { name: "meetingLink", label: "Google Meet link", type: "text" },
                        { name: "notes", label: "Session Notes", type: "textarea" },
                    ]}
                    initial={{ status: editing.status.toUpperCase(), meetingLink: editing.meetingLink ?? "", notes: editing.notes ?? "" }}
                />
            )}
        </div>
    );
}
