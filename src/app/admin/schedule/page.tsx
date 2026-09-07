"use client";

import { useCallback, useEffect, useState } from "react";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";
import { PageHeader, PageLoading, Card, EmptyState, StatusBadge, Button } from "@/components/admin/ui";
import { LuCalendarClock } from "react-icons/lu";

type ScheduleItem = {
    id: string;
    batchName: string;
    timeSlot: string;
    teacher: string;
    status: string;
    attendanceCount: number;
    meetingLink: string;
    batchMeetingLink: string;
};

type Batch = { id: string; name: string; timeSlot: string; daysOfWeek: string[]; teacher: string };

type ScheduleData = {
    schedule: Record<string, ScheduleItem[]>;
    batches: Batch[];
};

const STATUS_OPTIONS = [
    { label: "Scheduled", value: "Scheduled" },
    { label: "Completed", value: "Completed" },
    { label: "Cancelled", value: "Cancelled" },
];

export default function AdminSchedulePage() {
    const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<ScheduleItem | null>(null);

    const fetchSchedule = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/schedule');
            if (response.ok) setScheduleData(await response.json());
        } catch (error) {
            console.error('Failed to fetch schedule:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    const addClass = async (values: EntityValues) => {
        const res = await fetch('/api/admin/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batchId: values.batchId, date: values.date }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Could not add class');
        }
        setCreating(false);
        fetchSchedule();
    };

    const editClass = async (values: EntityValues) => {
        const res = await fetch('/api/admin/schedule', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: editing?.id,
                status: values.status,
                attendanceCount: values.attendanceCount,
                meetingLink: values.meetingLink,
            }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Could not update class');
        }
        setEditing(null);
        fetchSchedule();
    };

    if (loading) return <PageLoading title="Class Schedule" />;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const allScheduleItems: ScheduleItem[] = scheduleData ? Object.values(scheduleData.schedule).flat() : [];
    const batches = scheduleData?.batches ?? [];

    return (
        <div>
            <PageHeader title="Class Schedule" subtitle="Group-class instances for the next 7 days.">
                <Button icon={LuCalendarClock} onClick={() => setCreating(true)}>Add class</Button>
            </PageHeader>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-8">
                {days.map((day) => (
                    <Card key={day} className="p-4 text-center">
                        <div className="font-bold text-gray-800">{day}</div>
                        <div className="text-xs text-gray-400 mt-1">
                            {(scheduleData?.schedule[day] ?? []).length} class(es)
                        </div>
                    </Card>
                ))}
            </div>

            {allScheduleItems.length === 0 ? (
                <Card><EmptyState icon={LuCalendarClock} title="Nothing scheduled" hint="No classes scheduled for the next 7 days." /></Card>
            ) : (
                <div className="space-y-3">
                    {allScheduleItems.map((item) => (
                        <Card
                            key={item.id}
                            padded
                            className={`flex flex-wrap justify-between items-center gap-4 ${item.status === 'Cancelled' ? 'opacity-60' : ''}`}
                        >
                            <div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{item.timeSlot}</div>
                                <div className="text-lg font-bold text-gray-800">{item.batchName}</div>
                                <div className="text-sm text-gray-500">Instructor: {item.teacher}</div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-gray-800">{item.attendanceCount}</div>
                                    <div className="mt-0.5"><StatusBadge status={item.status} /></div>
                                </div>
                                <Button variant="secondary" size="sm" onClick={() => setEditing(item)}>Edit</Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {creating && (
                <EntityFormModal
                    title="Add Class Instance"
                    submitLabel="Add"
                    onCancel={() => setCreating(false)}
                    onSubmit={addClass}
                    fields={[
                        {
                            name: "batchId", label: "Batch", type: "select", required: true,
                            options: batches.map(b => ({ label: `${b.name} (${b.timeSlot})`, value: b.id })),
                        },
                        { name: "date", label: "Date & Time", type: "date", required: true },
                    ]}
                />
            )}

            {editing && (
                <EntityFormModal
                    title={`Edit ${editing.batchName}`}
                    onCancel={() => setEditing(null)}
                    onSubmit={editClass}
                    fields={[
                        { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTIONS },
                        { name: "attendanceCount", label: "Attendance", type: "number" },
                        {
                            name: "meetingLink",
                            label: "Google Meet link for this day (blank = use batch default)",
                            placeholder: editing.batchMeetingLink || "https://meet.google.com/…",
                        },
                    ]}
                    initial={{
                        status: editing.status,
                        attendanceCount: editing.attendanceCount,
                        meetingLink: editing.meetingLink,
                    }}
                />
            )}
        </div>
    );
}
