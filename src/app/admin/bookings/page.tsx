"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";

export type Booking = {
    id: string;
    userId: string;
    userName: string;
    type: 'Therapy' | 'Consultation' | 'Special Session';
    date: string;
    time: string;
    status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
    teacher: string;
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
            accessor: (bk: Booking) => (
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${bk.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                    bk.status === 'Pending' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-500'
                    }`}>
                    {bk.status}
                </span>
            )
        },
    ];

    const submitEdit = async (values: EntityValues) => {
        const res = await fetch('/api/admin/bookings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editing?.id, status: values.status, notes: values.notes }),
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

    if (loading) {
        return (
            <div>
                <div className="mb-8">
                    <h1 className="font-serif text-3xl text-gray-800 mb-2">Bookings & Trials</h1>
                    <p className="text-gray-500">Manage 1:1 therapy sessions, consultations, and trial bookings.</p>
                </div>
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="font-serif text-3xl text-gray-800 mb-2">Bookings & Trials</h1>
                <p className="text-gray-500">Manage 1:1 therapy sessions, consultations, and trial bookings.</p>
            </div>

            <DTable
                data={bookings}
                columns={columns}
                title="All Bookings"
                actions={(bk) => (
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setEditing(bk)} className="text-primary hover:text-secondary text-xs font-bold uppercase tracking-wider">Edit</button>
                        <button onClick={() => handleDelete(bk)} className="text-red-400 hover:text-red-600 text-xs font-bold uppercase tracking-wider">Delete</button>
                    </div>
                )}
            />

            {editing && (
                <EntityFormModal
                    title={`${editing.userName} — ${editing.type}`}
                    onCancel={() => setEditing(null)}
                    onSubmit={submitEdit}
                    fields={[
                        { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTIONS },
                        { name: "notes", label: "Session Notes", type: "textarea" },
                    ]}
                    initial={{ status: editing.status.toUpperCase() }}
                />
            )}
        </div>
    );
}
