"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";
import { PageHeader, PageLoading, Card, EmptyState, StatusBadge, Badge, Button, ActionButton, useConfirmDialog } from "@/components/admin/ui";
import { AttendanceModal } from "@/components/admin/AttendanceModal";
import { useToast } from "@/components/admin/Toast";
import { LuCalendarClock, LuChevronLeft, LuChevronRight, LuPlus, LuSearch, LuX, LuRotateCcw, LuFilter } from "react-icons/lu";

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

    // Filters state
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [selectedTeacher, setSelectedTeacher] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("");
    const [selectedBatch, setSelectedBatch] = useState<string>("");
    const [selectedAccess, setSelectedAccess] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");

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

    // Calculate the 7 days for the selected week starting at weekStart
    const weekStartDate = useMemo(() => new Date(`${weekStart}T00:00:00.000Z`), [weekStart]);
    const weekDays = useMemo(() => {
        return [0, 1, 2, 3, 4, 5, 6].map((offset) => {
            const d = new Date(weekStartDate);
            d.setUTCDate(d.getUTCDate() + offset);
            const dayKey = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Kolkata" }).format(d);
            const dateLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);
            const dateIso = d.toISOString().slice(0, 10);
            const isToday = dateIso === todayStr();
            return { dayKey, dateLabel, dateIso, isToday };
        });
    }, [weekStartDate]);

    // Flatten all schedule items across days with formatted dates and day tags
    const allScheduleItems = useMemo(() => {
        if (!scheduleData?.schedule) return [];
        const items: (ScheduleItem & { day: string; dateFormatted: string })[] = [];
        for (const [dayKey, dayList] of Object.entries(scheduleData.schedule)) {
            for (const item of dayList) {
                const itemDate = new Date(item.date);
                const dateFormatted = !isNaN(itemDate.getTime())
                    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(itemDate)
                    : "";
                items.push({ ...item, day: dayKey, dateFormatted });
            }
        }
        return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [scheduleData]);

    // Filter options
    const teacherOptions = useMemo(() => {
        const map = new Map<string, string>();
        (scheduleData?.teachers ?? []).forEach(t => map.set(t.id, t.name));
        allScheduleItems.forEach(i => {
            if (i.teacherId && i.teacher) map.set(i.teacherId, i.teacher);
            else if (i.teacher) map.set(i.teacher, i.teacher);
        });
        return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    }, [scheduleData, allScheduleItems]);

    const batchOptions = useMemo(() => {
        const names = new Set<string>();
        (scheduleData?.batches ?? []).forEach(b => names.add(b.name));
        allScheduleItems.forEach(i => names.add(i.batchName));
        return Array.from(names).sort();
    }, [scheduleData, allScheduleItems]);

    // Apply all active filters
    const filteredScheduleItems = useMemo(() => {
        return allScheduleItems.filter((item) => {
            if (selectedDay && item.day !== selectedDay) return false;
            if (selectedTeacher && item.teacherId !== selectedTeacher && item.teacher !== selectedTeacher) return false;
            if (selectedStatus && item.status !== selectedStatus) return false;
            if (selectedBatch && item.batchName !== selectedBatch) return false;
            if (selectedAccess === "open" && !item.openAccess) return false;
            if (selectedAccess === "members" && item.openAccess) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                const matches =
                    item.batchName.toLowerCase().includes(q) ||
                    item.teacher.toLowerCase().includes(q) ||
                    item.timeSlot.toLowerCase().includes(q) ||
                    item.day.toLowerCase().includes(q) ||
                    item.dateFormatted.toLowerCase().includes(q);
                if (!matches) return false;
            }
            return true;
        });
    }, [allScheduleItems, selectedDay, selectedTeacher, selectedStatus, selectedBatch, selectedAccess, searchQuery]);

    const hasActiveFilters = Boolean(
        selectedDay || selectedTeacher || selectedStatus || selectedBatch || selectedAccess || searchQuery.trim()
    );

    const clearAllFilters = () => {
        setSelectedDay(null);
        setSelectedTeacher("");
        setSelectedStatus("");
        setSelectedBatch("");
        setSelectedAccess("");
        setSearchQuery("");
    };

    if (loading) return <PageLoading title="Class Schedule" />;

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
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" icon={LuPlus} onClick={() => setCreatingOneTime(true)}>One-time class</Button>
                        <Button icon={LuCalendarClock} onClick={() => setCreating(true)}>Add class instance</Button>
                    </div>
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

            {/* Interactive Day Selector Cards */}
            <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs font-bold uppercase tracking-wider text-ink-subtle flex items-center gap-2">
                        <span>Filter By Day:</span>
                        {selectedDay ? (
                            <Badge tone="blue">Selected: {selectedDay}</Badge>
                        ) : (
                            <span className="text-gray-400 font-normal">All 7 Days</span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedDay(null)}
                        className={`text-xs px-3 py-1 rounded-full font-semibold transition-all border ${
                            selectedDay === null
                                ? "bg-brand text-white border-brand shadow-sm"
                                : "bg-surface text-ink-muted border-hairline hover:bg-surface-hover hover:text-ink"
                        }`}
                    >
                        View All 7 Days ({allScheduleItems.length})
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                    {weekDays.map(({ dayKey, dateLabel, isToday }) => {
                        const isSelected = selectedDay === dayKey;
                        const count = (scheduleData?.schedule[dayKey] ?? []).length;
                        return (
                            <button
                                key={`${dayKey}-${dateLabel}`}
                                type="button"
                                onClick={() => setSelectedDay(isSelected ? null : dayKey)}
                                className={`p-3 rounded-card text-left transition-all border relative flex flex-col justify-between cursor-pointer ${
                                    isSelected
                                        ? "bg-brand/10 border-brand ring-2 ring-brand/30 text-brand shadow-sm font-semibold"
                                        : "bg-surface border-hairline hover:border-brand/40 hover:bg-surface-hover text-ink shadow-raised"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className={`font-bold text-sm ${isSelected ? "text-brand" : "text-gray-800"}`}>
                                        {dayKey}
                                    </span>
                                    {isToday ? (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                            Today
                                        </span>
                                    ) : isSelected ? (
                                        <span className="w-2 h-2 rounded-full bg-brand" />
                                    ) : null}
                                </div>
                                <div className="text-xs text-gray-500 font-medium">{dateLabel}</div>
                                <div className={`text-xs mt-2 font-medium ${isSelected ? "text-brand font-bold" : "text-gray-400"}`}>
                                    {count} {count === 1 ? "class" : "classes"}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-surface rounded-card border border-hairline p-4 mb-6 shadow-raised space-y-3">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[220px]">
                        <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-sm" />
                        <input
                            type="text"
                            placeholder="Search by class name, instructor, or time..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 rounded-control border border-hairline text-sm bg-surface text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand/40 transition"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                            >
                                <LuX className="text-sm" />
                            </button>
                        )}
                    </div>

                    {/* Dropdown Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Instructor */}
                        <select
                            value={selectedTeacher}
                            onChange={(e) => setSelectedTeacher(e.target.value)}
                            className="px-3 py-2 border border-hairline rounded-control text-xs font-medium bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand/25"
                        >
                            <option value="">All Instructors</option>
                            {teacherOptions.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>

                        {/* Status */}
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="px-3 py-2 border border-hairline rounded-control text-xs font-medium bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand/25"
                        >
                            <option value="">All Statuses</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>

                        {/* Batch */}
                        <select
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value)}
                            className="px-3 py-2 border border-hairline rounded-control text-xs font-medium bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand/25"
                        >
                            <option value="">All Batches</option>
                            {batchOptions.map((name) => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>

                        {/* Access */}
                        <select
                            value={selectedAccess}
                            onChange={(e) => setSelectedAccess(e.target.value)}
                            className="px-3 py-2 border border-hairline rounded-control text-xs font-medium bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand/25"
                        >
                            <option value="">All Access Types</option>
                            <option value="open">Open Access (Public)</option>
                            <option value="members">Members Only</option>
                        </select>

                        {/* Clear button */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-control text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-200 cursor-pointer"
                            >
                                <LuRotateCcw className="text-xs" />
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Active filter summary & chips */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-hairline text-xs">
                    <div className="text-ink-muted">
                        Showing <strong className="text-ink font-semibold">{filteredScheduleItems.length}</strong> of {allScheduleItems.length} classes
                        {selectedDay && <span> on <strong className="text-ink font-semibold">{selectedDay}</strong></span>}
                    </div>

                    {hasActiveFilters && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {selectedDay && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[11px] font-semibold">
                                    Day: {selectedDay}
                                    <button type="button" onClick={() => setSelectedDay(null)} className="cursor-pointer"><LuX className="hover:text-red-500" /></button>
                                </span>
                            )}
                            {selectedTeacher && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/[0.05] text-ink text-[11px] font-semibold">
                                    Instructor: {teacherOptions.find(t => t.value === selectedTeacher)?.label || selectedTeacher}
                                    <button type="button" onClick={() => setSelectedTeacher("")} className="cursor-pointer"><LuX className="hover:text-red-500" /></button>
                                </span>
                            )}
                            {selectedStatus && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/[0.05] text-ink text-[11px] font-semibold">
                                    Status: {selectedStatus}
                                    <button type="button" onClick={() => setSelectedStatus("")} className="cursor-pointer"><LuX className="hover:text-red-500" /></button>
                                </span>
                            )}
                            {selectedBatch && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/[0.05] text-ink text-[11px] font-semibold">
                                    Batch: {selectedBatch}
                                    <button type="button" onClick={() => setSelectedBatch("")} className="cursor-pointer"><LuX className="hover:text-red-500" /></button>
                                </span>
                            )}
                            {selectedAccess && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/[0.05] text-ink text-[11px] font-semibold">
                                    Access: {selectedAccess === "open" ? "Open Access" : "Members Only"}
                                    <button type="button" onClick={() => setSelectedAccess("")} className="cursor-pointer"><LuX className="hover:text-red-500" /></button>
                                </span>
                            )}
                            {searchQuery.trim() && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/[0.05] text-ink text-[11px] font-semibold">
                                    Query: &ldquo;{searchQuery.trim()}&rdquo;
                                    <button type="button" onClick={() => setSearchQuery("")} className="cursor-pointer"><LuX className="hover:text-red-500" /></button>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Classes List or Empty State */}
            {allScheduleItems.length === 0 ? (
                <Card><EmptyState icon={LuCalendarClock} title="Nothing scheduled" hint="No classes scheduled for the next 7 days." /></Card>
            ) : filteredScheduleItems.length === 0 ? (
                <Card padded className="text-center py-12">
                    <div className="mx-auto w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand mb-3">
                        <LuFilter className="text-xl" />
                    </div>
                    <h3 className="font-semibold text-gray-800 text-base mb-1">No classes match your filters</h3>
                    <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                        No class instances match your active filter criteria. Try adjusting or clearing some filters.
                    </p>
                    <Button variant="secondary" size="sm" icon={LuRotateCcw} onClick={clearAllFilters}>
                        Clear All Filters
                    </Button>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredScheduleItems.map((item) => (
                        <Card
                            key={item.id}
                            padded
                            className={`flex flex-wrap justify-between items-center gap-4 transition-all hover:border-brand/30 ${item.status === 'Cancelled' ? 'opacity-60 bg-gray-50/50' : ''}`}
                        >
                            <div>
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand/10 text-brand ring-1 ring-inset ring-brand/20">
                                        {item.day}, {item.dateFormatted}
                                    </span>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {item.timeSlot}
                                    </span>
                                </div>
                                <div className="text-lg font-bold text-gray-800 flex items-center gap-2 flex-wrap">
                                    {item.batchName}
                                    {item.openAccess && <Badge tone="blue">Open Access</Badge>}
                                </div>
                                <div className="text-sm text-gray-500 mt-0.5">
                                    Instructor: <span className="font-medium text-gray-700">{item.teacher}</span>
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
