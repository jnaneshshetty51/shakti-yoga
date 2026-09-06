"use client";

import { useCallback, useEffect, useState } from "react";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";

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

    if (loading) {
        return (
            <div>
                <h1 className="font-serif text-3xl text-gray-800 mb-8">Class Schedule</h1>
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const allScheduleItems: ScheduleItem[] = scheduleData ? Object.values(scheduleData.schedule).flat() : [];
    const batches = scheduleData?.batches ?? [];

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="font-serif text-3xl text-gray-800">Class Schedule</h1>
                <button
                    onClick={() => setCreating(true)}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-bold uppercase tracking-widest rounded hover:bg-gray-700 transition-colors"
                >
                    Add Class
                </button>
            </div>

            <div className="grid md:grid-cols-7 gap-4 mb-8">
                {days.map((day) => (
                    <div key={day} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center font-bold text-gray-800">
                        {day}
                        <div className="text-xs font-normal text-gray-400 mt-1">
                            {(scheduleData?.schedule[day] ?? []).length} class(es)
                        </div>
                    </div>
                ))}
            </div>

            {allScheduleItems.length === 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
                    No classes scheduled for the next 7 days.
                </div>
            ) : (
                <div className="space-y-4">
                    {allScheduleItems.map((item) => (
                        <div
                            key={item.id}
                            className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center ${item.status === 'Cancelled' ? 'opacity-60' : ''}`}
                        >
                            <div>
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{item.timeSlot}</div>
                                <div className="text-xl font-bold text-gray-800">{item.batchName}</div>
                                <div className="text-sm text-gray-600">Instructor: {item.teacher}</div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-gray-800">{item.attendanceCount}</div>
                                    <div className="text-xs text-gray-500">{item.status}</div>
                                </div>
                                <button
                                    onClick={() => setEditing(item)}
                                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                                >
                                    Edit
                                </button>
                            </div>
                        </div>
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
