"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues, type FieldDef } from "@/components/admin/EntityFormModal";
import { PageHeader, PageLoading, Badge, TableActions, ActionButton } from "@/components/admin/ui";

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
    capacity?: number | string;
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
                        <span key={d} className="px-1.5 py-0.5 bg-gray-100 rounded-md text-[10px] uppercase text-gray-500 font-medium">{d}</span>
                    ))}
                </div>
            )
        },
        { header: "Teacher", accessor: "teacher" as keyof ClassBatch },
        {
            header: "Status",
            accessor: (batch: ClassBatch) => (
                <Badge tone={batch.active ? "green" : "gray"}>{batch.active ? "Active" : "Inactive"}</Badge>
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
        { name: "capacity", label: "Capacity (blank = unlimited)", type: "number" },
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

    if (loading) return <PageLoading title="Class Management" />;

    return (
        <div>
            <PageHeader title="Class Management" subtitle="Manage recurring class batches and schedules." />

            <DTable
                data={batches}
                columns={columns}
                title="Class Batches"
                onCreate={() => setCreating(true)}
                actions={(batch) => (
                    <TableActions>
                        <ActionButton onClick={() => setEditing(batch)}>Edit</ActionButton>
                        <ActionButton tone="danger" onClick={() => handleDelete(batch)}>Delete</ActionButton>
                    </TableActions>
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
                        capacity: editing.capacity ?? "",
                        active: editing.active,
                    }}
                    onCancel={() => setEditing(null)}
                    onSubmit={(v) => save(v, editing.id)}
                />
            )}
        </div>
    );
}
