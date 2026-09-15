"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import { PageHeader, PageLoading, Card, Badge, Tabs, TableActions, ActionButton } from "@/components/admin/ui";
import { AttendanceModal } from "@/components/admin/AttendanceModal";
import { useToast } from "@/components/admin/Toast";

type TodayInstance = {
    id: string;
    batchName: string;
    teacher: string;
    date: string;
    status: string;
    presentCount: number;
    absentCount: number;
    pendingCount: number;
};

type HistoryRow = {
    id: string;
    classInstanceId: string;
    studentName: string;
    studentEmail: string;
    batchName: string;
    teacher: string;
    date: string;
    status: "CHECKED_IN" | "PRESENT" | "ABSENT";
    addedByTeacher: boolean;
    confirmedBy: string | null;
};

const STATUS_TONE: Record<HistoryRow["status"], "gray" | "green" | "red"> = {
    CHECKED_IN: "gray",
    PRESENT: "green",
    ABSENT: "red",
};
const STATUS_FILTER = [
    { label: "Pending", value: "CHECKED_IN" },
    { label: "Present", value: "PRESENT" },
    { label: "Absent", value: "ABSENT" },
];
const PAGE_SIZE = 25;

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}
function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}
function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Attendance — kept separate from Classes & Schedule. Today's check-in
 * status at a glance, plus a searchable history/corrections ledger across
 * every student and teacher. Confirming attendance (Present/Absent) is the
 * trusted event that drives credit deduction (see applyAttendance) and,
 * downstream, progress and gamification — never inferred from a client claim.
 */
export default function AdminAttendancePage() {
    const { showToast } = useToast();
    const [tab, setTab] = useState<"today" | "history">("today");

    const [date, setDate] = useState(todayStr());
    const [today, setToday] = useState<TodayInstance[] | null>(null);
    const [attendanceFor, setAttendanceFor] = useState<string | null>(null);

    const [rows, setRows] = useState<HistoryRow[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const fetchToday = useCallback(async () => {
        const res = await fetch(`/api/admin/attendance?mode=today&date=${date}`);
        if (res.ok) setToday((await res.json()).instances || []);
    }, [date]);

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const params = new URLSearchParams({ mode: "history", page: String(page), pageSize: String(PAGE_SIZE) });
            if (search) params.set("q", search);
            if (statusFilter) params.set("status", statusFilter);
            const res = await fetch(`/api/admin/attendance?${params}`);
            if (res.ok) {
                const data = await res.json();
                setRows(data.rows || []);
                setTotalCount(data.totalCount ?? 0);
            }
        } finally {
            setHistoryLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => { if (tab === "today") fetchToday(); }, [tab, fetchToday]);
    useEffect(() => { if (tab === "history") fetchHistory(); }, [tab, fetchHistory]);

    const correct = async (row: HistoryRow, classInstanceId: string, status: "PRESENT" | "ABSENT") => {
        const res = await fetch("/api/admin/attendance", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: row.id, classInstanceId, status }),
        });
        if (!res.ok) {
            showToast("error", (await res.json().catch(() => ({}))).error || "Could not update.");
            return;
        }
        showToast("success", "Attendance corrected.");
        fetchHistory();
    };

    return (
        <div>
            <PageHeader title="Attendance" subtitle="Today's check-ins, and a searchable history across every student and teacher." />

            <div className="mb-6">
                <Tabs
                    active={tab}
                    onChange={(k) => setTab(k as "today" | "history")}
                    tabs={[
                        { key: "today", label: "Today" },
                        { key: "history", label: "History & Corrections" },
                    ]}
                />
            </div>

            {tab === "today" ? (
                <>
                    <div className="flex items-center gap-3 mb-4">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-control text-sm bg-white"
                        />
                        {date !== todayStr() && (
                            <button onClick={() => setDate(todayStr())} className="text-xs font-semibold text-brand hover:text-brand-strong">
                                Back to today
                            </button>
                        )}
                    </div>

                    {!today ? (
                        <PageLoading title="Attendance" />
                    ) : today.length === 0 ? (
                        <Card><p className="text-sm text-gray-500 text-center py-8">No classes on this date.</p></Card>
                    ) : (
                        <div className="space-y-3">
                            {today.map((i) => (
                                <Card key={i.id} padded className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{fmtTime(i.date)}</div>
                                        <div className="text-lg font-bold text-gray-800">{i.batchName}</div>
                                        <div className="text-sm text-gray-500">Instructor: {i.teacher}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex gap-2 text-sm">
                                            <Badge tone="green">{i.presentCount} present</Badge>
                                            {i.pendingCount > 0 && <Badge tone="amber">{i.pendingCount} pending</Badge>}
                                            {i.absentCount > 0 && <Badge tone="red">{i.absentCount} absent</Badge>}
                                        </div>
                                        <ActionButton onClick={() => setAttendanceFor(i.id)}>Confirm attendance</ActionButton>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <DTable
                    data={rows}
                    columns={[
                        {
                            header: "Student",
                            accessor: (r: HistoryRow) => (
                                <div><div className="font-bold text-gray-800">{r.studentName}</div><div className="text-xs text-gray-400">{r.studentEmail}</div></div>
                            ),
                        },
                        { header: "Class", accessor: (r: HistoryRow) => <div><div>{r.batchName}</div><div className="text-xs text-gray-400">{r.teacher}</div></div> },
                        { header: "Date", accessor: (r: HistoryRow) => fmtDate(r.date) },
                        { header: "Status", accessor: (r: HistoryRow) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
                        { header: "Confirmed by", accessor: (r: HistoryRow) => r.confirmedBy || <span className="text-gray-300">—</span> },
                    ]}
                    title="Attendance history"
                    searchable
                    filters={[{ key: "status", label: "Status", options: STATUS_FILTER }]}
                    server={{
                        page,
                        pageSize: PAGE_SIZE,
                        totalCount,
                        onPageChange: setPage,
                        onSearchChange: (q) => { setSearch(q); setPage(1); },
                        onFilterChange: (key, value) => { if (key === "status") setStatusFilter(value); setPage(1); },
                    }}
                    actions={(r: HistoryRow) => (
                        <TableActions>
                            {r.status !== "PRESENT" && (
                                <ActionButton onClick={() => correct(r, r.classInstanceId, "PRESENT")}>Mark present</ActionButton>
                            )}
                            {r.status !== "ABSENT" && (
                                <ActionButton tone="danger" onClick={() => correct(r, r.classInstanceId, "ABSENT")}>Mark absent</ActionButton>
                            )}
                        </TableActions>
                    )}
                />
            )}

            {historyLoading && tab === "history" && rows.length === 0 && <PageLoading title="Attendance" />}

            {attendanceFor && (
                <AttendanceModal instanceId={attendanceFor} onClose={() => { setAttendanceFor(null); fetchToday(); }} />
            )}
        </div>
    );
}
