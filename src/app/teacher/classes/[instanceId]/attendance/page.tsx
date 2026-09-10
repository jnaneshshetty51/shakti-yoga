"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LuArrowLeft, LuUsers } from "react-icons/lu";
import { useToast } from "@/components/admin/Toast";
import {
    PageHeader,
    PageLoading,
    Card,
    Button,
    Badge,
    EmptyState,
    ErrorState,
    SegmentedControl,
} from "@/components/ui";

type Mark = "PRESENT" | "ABSENT" | "UNMARKED";

interface RosterRow {
    attendanceId: string;
    userId: string;
    name: string;
    email: string;
    status: "CHECKED_IN" | "PRESENT" | "ABSENT";
    checkedInAt: string;
    addedByTeacher: boolean;
    confirmed: boolean;
}

interface RosterResponse {
    instance: { id: string; batchName: string; startsAt: string; status: string };
    window: { opensAt: string; closesAt: string };
    roster: RosterRow[];
}

const MARK_OPTIONS: { value: Mark; label: string }[] = [
    { value: "PRESENT", label: "Present" },
    { value: "ABSENT", label: "Absent" },
    { value: "UNMARKED", label: "—" },
];

function fmt(iso: string) {
    return new Date(iso).toLocaleString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
    });
}

export default function ClassAttendancePage({
    params,
}: {
    params: Promise<{ instanceId: string }>;
}) {
    const { instanceId } = use(params);
    const router = useRouter();
    const { showToast } = useToast();

    const [data, setData] = useState<RosterResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [marks, setMarks] = useState<Record<string, Mark>>({});

    const load = useCallback(async () => {
        try {
            const res = await fetch(`/api/teacher/classes/${instanceId}/attendance`, { cache: "no-store" });
            if (!res.ok) throw new Error(String(res.status));
            const json = (await res.json()) as RosterResponse;
            setData(json);
            setMarks(
                Object.fromEntries(
                    json.roster.map((r) => [
                        r.userId,
                        r.status === "PRESENT" ? "PRESENT" : r.status === "ABSENT" ? "ABSENT" : "UNMARKED",
                    ]),
                ),
            );
            setError(null);
        } catch {
            setError("Could not load the roster for this class.");
        } finally {
            setLoading(false);
        }
    }, [instanceId]);

    useEffect(() => {
        load();
    }, [load]);

    const windowClosed = useMemo(
        () => (data ? Date.now() > new Date(data.window.closesAt).getTime() : false),
        [data],
    );
    const notStarted = useMemo(
        () => (data ? Date.now() < new Date(data.window.opensAt).getTime() : false),
        [data],
    );

    const dirtyDecisions = useMemo(() => {
        if (!data) return [];
        return data.roster
            .map((r) => ({ userId: r.userId, status: marks[r.userId] }))
            .filter((d): d is { userId: string; status: "PRESENT" | "ABSENT" } => d.status === "PRESENT" || d.status === "ABSENT");
    }, [data, marks]);

    const submit = async (finalize: boolean) => {
        if (!finalize && dirtyDecisions.length === 0) {
            showToast("info", "Mark at least one member Present or Absent first.");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`/api/teacher/classes/${instanceId}/attendance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ decisions: dirtyDecisions, finalize }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                showToast("error", json.error || "Could not save attendance.");
                return;
            }
            showToast("success", finalize ? "Attendance finalised." : `${json.confirmed} updated.`);
            await load();
        } finally {
            setSaving(false);
        }
    };

    if (loading && !data) return <PageLoading />;
    if (error && !data) return <ErrorState message={error} onRetry={load} />;
    if (!data) return null;

    const checkedIn = data.roster.filter((r) => !r.addedByTeacher).length;
    const presentCount = Object.values(marks).filter((m) => m === "PRESENT").length;

    return (
        <div>
            <button
                onClick={() => router.push("/teacher")}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4"
            >
                <LuArrowLeft /> Back to today
            </button>

            <PageHeader
                title={data.instance.batchName}
                subtitle={`${fmt(data.instance.startsAt)} · ${checkedIn} checked in · ${presentCount} present`}
            />

            {notStarted && (
                <Card padded className="mb-4">
                    <p className="text-sm text-amber-700">
                        This class hasn&rsquo;t started yet. You can finalise attendance once it begins.
                    </p>
                </Card>
            )}
            {windowClosed && (
                <Card padded className="mb-4">
                    <p className="text-sm text-gray-600">
                        Attendance for this class is locked. Ask an admin for a correction.
                    </p>
                </Card>
            )}

            <Card className="overflow-hidden mb-6">
                {data.roster.length === 0 ? (
                    <EmptyState icon={LuUsers} title="Nobody has checked in yet" />
                ) : (
                    <ul className="divide-y divide-gray-50">
                        {data.roster.map((r) => (
                            <li key={r.attendanceId} className="flex items-center justify-between gap-3 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-800 truncate">
                                        {r.name}
                                        {r.addedByTeacher && (
                                            <Badge tone="gray" className="ml-2">
                                                added
                                            </Badge>
                                        )}
                                        {r.confirmed && (
                                            <Badge tone="green" className="ml-2">
                                                confirmed
                                            </Badge>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                        {r.addedByTeacher ? r.email : `checked in ${fmt(r.checkedInAt)}`}
                                    </p>
                                </div>
                                <SegmentedControl<Mark>
                                    size="sm"
                                    aria-label={`Attendance for ${r.name}`}
                                    options={MARK_OPTIONS}
                                    value={marks[r.userId] ?? "UNMARKED"}
                                    onChange={(v) => setMarks((m) => ({ ...m, [r.userId]: v }))}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <div className="flex flex-wrap gap-3">
                <Button
                    onClick={() => submit(false)}
                    disabled={saving || windowClosed || notStarted || dirtyDecisions.length === 0}
                >
                    Save changes
                </Button>
                <Button
                    variant="secondary"
                    onClick={() => {
                        setMarks((m) => {
                            const next = { ...m };
                            for (const r of data.roster) if (next[r.userId] === "UNMARKED") next[r.userId] = "PRESENT";
                            return next;
                        });
                    }}
                    disabled={saving || windowClosed}
                >
                    Mark remaining present
                </Button>
                <Button
                    variant="secondary"
                    onClick={() => submit(true)}
                    disabled={saving || windowClosed || notStarted}
                >
                    Save &amp; finalise
                </Button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
                Finalising marks anyone still unmarked as Present. Only Present attendance uses a member&rsquo;s
                session credit; Absent never charges.
            </p>
        </div>
    );
}
