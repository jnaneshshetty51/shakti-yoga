"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues, type FieldDef } from "@/components/admin/EntityFormModal";

export type ClassBatch = {
    id: string;
    name: string;
    time: string;
    timeSlot: string;
    durationMin: number;
    days: string[];
    daysOfWeek: string;
    planType: string;
    teacher: string;
    teacherId: string;
    meetingLink: string;
    active: boolean;
};

type Teacher = { id: string; name: string };

// Yoga Therapy is strictly 1:1 (Booking), so it is not a group-class plan.
const PLAN_OPTIONS = [
    { label: "Everyday Yoga", value: "EVERYDAY_YOGA" },
    { label: "Trial", value: "TRIAL" },
];

export default function AdminClassesPage() {
    const [batches, setBatches] = useState<ClassBatch[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<ClassBatch | null>(null);
    const [creating, setCreating] = useState(false);

    const fetchBatches = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/classes');
            if (response.ok) {
                const data = await response.json();
                setBatches(data.batches || []);
                setTeachers(data.teachers || []);
            }
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBatches();
    }, [fetchBatches]);

    const columns = [
        { header: "Batch Name", accessor: "name" as keyof ClassBatch, className: "font-bold text-gray-800" },
        { header: "Time", accessor: "time" as keyof ClassBatch },
        {
            header: "Days",
            accessor: (batch: ClassBatch) => (
                <div className="flex gap-1 flex-wrap">
                    {batch.days.map(d => (
                        <span key={d} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] uppercase text-gray-600">{d}</span>
                    ))}
                </div>
            )
        },
        { header: "Teacher", accessor: "teacher" as keyof ClassBatch },
        {
            header: "Status",
            accessor: (batch: ClassBatch) => (
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${batch.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    {batch.active ? 'Active' : 'Inactive'}
                </span>
            )
        },
    ];

    const fields: FieldDef[] = [
        { name: "name", label: "Batch Name", required: true },
        { name: "timeSlot", label: "Time Slot (IST)", required: true, placeholder: "06:00 AM" },
        { name: "durationMin", label: "Duration (minutes)", type: "number", placeholder: "60" },
        { name: "daysOfWeek", label: "Days (comma separated)", required: true, placeholder: "Mon,Wed,Fri" },
        { name: "planType", label: "Plan", type: "select", required: true, options: PLAN_OPTIONS },
        {
            name: "teacherId", label: "Teacher", type: "select", required: true,
            options: teachers.map(t => ({ label: t.name, value: t.id })),
        },
        { name: "meetingLink", label: "Default Google Meet Link", placeholder: "https://meet.google.com/…" },
        { name: "active", label: "Active", type: "checkbox" },
    ];

    const save = async (values: EntityValues, id?: string) => {
        const res = await fetch('/api/admin/classes', {
            method: id ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...values, id }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Save failed');
        }
        setEditing(null);
        setCreating(false);
        fetchBatches();
    };

    const handleDelete = async (batch: ClassBatch) => {
        if (!confirm(`Delete "${batch.name}"? Its scheduled instances are removed too.`)) return;
        await fetch(`/api/admin/classes?id=${batch.id}`, { method: 'DELETE' });
        fetchBatches();
    };

    if (loading) {
        return (
            <div>
                <div className="mb-8">
                    <h1 className="font-serif text-3xl text-gray-800 mb-2">Class Management</h1>
                    <p className="text-gray-500">Manage recurring class batches and schedules.</p>
                </div>
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="font-serif text-3xl text-gray-800 mb-2">Class Management</h1>
                <p className="text-gray-500">Manage recurring class batches and schedules.</p>
            </div>

            <DTable
                data={batches}
                columns={columns}
                title="Class Batches"
                onCreate={() => setCreating(true)}
                actions={(batch) => (
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setEditing(batch)} className="text-primary hover:text-secondary text-xs font-bold uppercase tracking-wider">Edit</button>
                        <button onClick={() => handleDelete(batch)} className="text-red-400 hover:text-red-600 text-xs font-bold uppercase tracking-wider">Delete</button>
                    </div>
                )}
            />

            {creating && (
                <EntityFormModal
                    title="New Class Batch"
                    submitLabel="Create"
                    fields={fields}
                    initial={{ active: true, durationMin: 60 }}
                    onCancel={() => setCreating(false)}
                    onSubmit={(v) => save(v)}
                />
            )}

            {editing && (
                <EntityFormModal
                    title={`Edit ${editing.name}`}
                    fields={fields}
                    initial={{
                        name: editing.name,
                        timeSlot: editing.timeSlot,
                        durationMin: editing.durationMin,
                        daysOfWeek: editing.daysOfWeek,
                        planType: editing.planType,
                        teacherId: editing.teacherId,
                        meetingLink: editing.meetingLink,
                        active: editing.active,
                    }}
                    onCancel={() => setEditing(null)}
                    onSubmit={(v) => save(v, editing.id)}
                />
            )}
        </div>
    );
}
