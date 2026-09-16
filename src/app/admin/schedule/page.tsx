"use client";

import { useCallback, useEffect, useState } from "react";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";
import { PageHeader, PageLoading, Card, EmptyState, StatusBadge, Badge, Button, ActionButton, useConfirmDialog } from "@/components/admin/ui";
import { AttendanceModal } from "@/components/admin/AttendanceModal";
import { useToast } from "@/components/admin/Toast";
import { LuCalendarClock, LuChevronLeft, LuChevronRight, LuPlus } from "react-icons/lu";

type ScheduleItem = {
    id: string;
    batchName: string;
    timeSlot: string;
    teacher: string;
    teacherId: string;
    isSubstitute: boolean;
    status: string;
    attendanceCount: number;
    capacity: number | null;
    meetingLink: string;
    batchMeetingLink: string;
    date: string;
    openAccess: boolean;
};

type Batch = { id: string; name: string; timeSlot: string; daysOfWeek: string[]; teacher: string };
type Teacher = { id: string; name: string };

type ScheduleData = {
    windowStart: string;
    schedule: Record<string, ScheduleItem[]>;
    batches: Batch[];
    teachers: Teacher[];
};

/** "2026-09-17T13:30" — the value a datetime-local input needs, from a UTC ISO instant. */
function toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
const todayStr = () => toDateStr(new Date());

const STATUS_OPTIONS = [
    { label: "Scheduled", value: "Scheduled" },
    { label: "Completed", value: "Completed" },
    { label: "Cancelled", value: "Cancelled" },
];

export function AdminScheduleContent({ embedded = false }: { embedded?: boolean } = {}) {
    const { showToast } = useToast();
    const { confirm, dialog } = useConfirmDialog();
    const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
    const [weekStart, setWeekStart] = useState(todayStr());
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [creatingOneTime, setCreatingOneTime] = useState(false);
    const [editing, setEditing] = useState<ScheduleItem | null>(null);
    const [attendanceFor, setAttendanceFor] = useState<string | null>(null);

    const fetchSchedule = useCallback(async () => {
        try {
            const response = await fetch(`/api/admin/schedule?start=${weekStart}`);
            if (response.ok) setScheduleData(await response.json());
        } catch (error) {
            console.error('Failed to fetch schedule:', error);
        } finally {
            setLoading(false);
        }
    }, [weekStart]);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    const shiftWeek = (days: number) => {
        const d = new Date(`${weekStart}T00:00:00.000Z`);
        d.setUTCDate(d.getUTCDate() + days);
        setWeekStart(toDateStr(d));
    };

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

    const addOneTimeClass = async (values: EntityValues) => {
        const res = await fetch('/api/admin/schedule/one-time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Could not create the class');
        }
        setCreatingOneTime(false);
        fetchSchedule();
    };

    const editClass = async (values: EntityValues) => {
        const res = await fetch('/api/admin/schedule', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: editing?.id,
                status: values.status,
                date: values.date,
                teacherId: values.teacherId || null,
                openAccess: values.openAccess === true,
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

    const cancelClass = async (item: ScheduleItem) => {
        const ok = await confirm({
            title: `Cancel ${item.batchName} on ${item.timeSlot}?`,
            message: "Members who'd have joined are notified.",
            confirmLabel: "Cancel class",
            tone: "danger",
        });
        if (!ok) return;
        const res = await fetch("/api/admin/schedule", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id, status: "Cancelled" }),
        });
        if (!res.ok) return showToast("error", (await res.json().catch(() => ({}))).error || "Could not cancel");
        showToast("success", "Class cancelled.");
        fetchSchedule();
    };

    const deleteClass = async (item: ScheduleItem) => {
        const ok = await confirm({
            title: `Permanently delete ${item.batchName} on ${item.timeSlot}?`,
            message: "This removes the record entirely — prefer Cancel above to keep it for history.",
            confirmLabel: "Delete",
            tone: "danger",
        });
        if (!ok) return;
        const res = await fetch(`/api/admin/schedule?id=${item.id}`, { method: "DELETE" });
        if (!res.ok) return showToast("error", (await res.json().catch(() => ({}))).error || "Could not delete");
        showToast("success", "Class deleted.");
        fetchSchedule();
    };

    if (loading) return <PageLoading title="Class Schedule" />;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const allScheduleItems: ScheduleItem[] = scheduleData ? Object.values(scheduleData.schedule).flat() : [];
    const batches = scheduleData?.batches ?? [];

    return (
        <div>
            {dialog}
            {embedded ? (
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-1.5">
                        <Button variant="secondary" size="sm" icon={LuChevronLeft} onClick={() => shiftWeek(-7)}>Prev</Button>
                        {weekStart !== todayStr() && (
                            <Button variant="secondary" size="sm" onClick={() => setWeekStart(todayStr())}>Today</Button>
                        )}
                        <Button variant="secondary" size="sm" icon={LuChevronRight} onClick={() => shiftWeek(7)}>Next</Button>
                    </div>
                    <Button variant="secondary" icon={LuPlus} onClick={() => setCreatingOneTime(true)}>One-time class</Button>
                    <Button icon={LuCalendarClock} onClick={() => setCreating(true)}>Add class instance</Button>
                </div>
            ) : (
                <PageHeader
                    title="Daily Schedule & Attendance"
                    subtitle={`Class instances from ${new Date(`${weekStart}T00:00:00.000Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}, 7 days. Google Meet links and student attendance check-ins.`}
                >
                    <div className="flex items-center gap-1.5">
                        <Button variant="secondary" size="sm" icon={LuChevronLeft} onClick={() => shiftWeek(-7)}>Prev</Button>
                        {weekStart !== todayStr() && (
                            <Button variant="secondary" size="sm" onClick={() => setWeekStart(todayStr())}>Today</Button>
                        )}
                        <Button variant="secondary" size="sm" icon={LuChevronRight} onClick={() => shiftWeek(7)}>Next</Button>
                    </div>
                    <a
                        href="/admin/classes"
                        className="px-3 py-2 text-xs font-semibold rounded-control border border-hairline bg-surface hover:bg-surface-hover text-ink transition-colors"
                    >
                        Manage Master Batches →
                    </a>
                    <Button variant="secondary" icon={LuPlus} onClick={() => setCreatingOneTime(true)}>One-time class</Button>
                    <Button icon={LuCalendarClock} onClick={() => setCreating(true)}>Add class instance</Button>
                </PageHeader>
            )}

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
                                <div className="text-lg font-bold text-gray-800 flex items-center gap-2 flex-wrap">
                                    {item.batchName}
                                    {item.openAccess && <Badge tone="blue">Open</Badge>}
                                </div>
                                <div className="text-sm text-gray-500">
                                    Instructor: {item.teacher}
                                    {item.isSubstitute && <span className="text-amber-600 font-medium"> (substitute)</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-gray-800">
                                        {item.attendanceCount}{item.capacity != null && <span className="text-sm text-gray-400">/{item.capacity}</span>}
                                    </div>
                                    <div className="mt-0.5"><StatusBadge status={item.status} /></div>
                                </div>
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                                    <ActionButton onClick={() => setAttendanceFor(item.id)}>Attendance</ActionButton>
                                    <Button variant="secondary" size="sm" onClick={() => setEditing(item)}>Edit</Button>
                                    {item.status !== 'Cancelled' && item.status !== 'Completed' && (
                                        <ActionButton onClick={() => cancelClass(item)}>Cancel</ActionButton>
                                    )}
                                    <ActionButton tone="danger" onClick={() => deleteClass(item)}>Delete</ActionButton>
                                </div>
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
                        { name: "date", label: "Date & Time", type: "datetime-local", required: true },
                    ]}
                />
            )}

            {creatingOneTime && (
                <EntityFormModal
                    title="New One-Time Class"
                    submitLabel="Create"
                    onCancel={() => setCreatingOneTime(false)}
                    onSubmit={addOneTimeClass}
                    fields={[
                        { name: "name", label: "Class name", required: true, placeholder: "e.g. New Year Special Session" },
                        {
                            name: "teacherId", label: "Teacher", type: "select", required: true,
                            options: (scheduleData?.teachers ?? []).map(t => ({ label: t.name, value: t.id })),
                        },
                        { name: "date", label: "Date & Time", type: "datetime-local", required: true },
                        { name: "durationMin", label: "Duration (minutes)", type: "number", placeholder: "60" },
                        { name: "capacity", label: "Capacity (blank = unlimited)", type: "number" },
                        { name: "meetingLink", label: "Google Meet link", placeholder: "https://meet.google.com/…" },
                        { name: "openAccess", label: "Free / open — no membership required to join", type: "checkbox" },
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
                        { name: "date", label: "Date & Time (reschedule this occurrence only)", type: "datetime-local", required: true },
                        {
                            name: "teacherId", label: "Teacher (substitute for this occurrence only)", type: "select",
                            options: [{ label: `${editing.teacher} (default)`, value: "" }, ...(scheduleData?.teachers ?? []).map(t => ({ label: t.name, value: t.id }))],
                        },
                        { name: "openAccess", label: "Free / open — no membership required to join", type: "checkbox" },
                        {
                            name: "meetingLink",
                            label: "Google Meet link for this day (blank = use batch default)",
                            placeholder: editing.batchMeetingLink || "https://meet.google.com/…",
                        },
                    ]}
                    initial={{
                        status: editing.status,
                        date: toDatetimeLocal(editing.date),
                        teacherId: editing.isSubstitute ? editing.teacherId : "",
                        openAccess: editing.openAccess,
                        meetingLink: editing.meetingLink,
                    }}
                />
            )}

            {attendanceFor && (
                <AttendanceModal instanceId={attendanceFor} onClose={() => { setAttendanceFor(null); fetchSchedule(); }} />
            )}
        </div>
    );
}

export default function AdminSchedulePage() {
    return <AdminScheduleContent />;
}
