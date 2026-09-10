"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, ActionButton } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

type Attendee = { userId: string; name: string; email: string; status: string; confirmed: boolean; addedByTeacher: boolean };

/** Per-member attendance confirmation for one class instance. */
export function AttendanceModal({ instanceId, onClose }: { instanceId: string; onClose: () => void }) {
    const { showToast } = useToast();
    const [info, setInfo] = useState<{ batchName: string; date: string } | null>(null);
    const [rows, setRows] = useState<Attendee[]>([]);
    const [marks, setMarks] = useState<Record<string, "PRESENT" | "ABSENT">>({});
    const [addEmail, setAddEmail] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/schedule/${instanceId}/attendance`);
        if (res.ok) {
            const d = await res.json();
            setInfo(d.instance);
            setRows(d.attendees);
            setMarks(Object.fromEntries(d.attendees.map((a: Attendee) => [a.userId, a.status === "ABSENT" ? "ABSENT" : "PRESENT"])));
        }
    }, [instanceId]);
    useEffect(() => { load(); }, [load]);

    const save = async () => {
        setBusy(true);
        try {
            const res = await fetch(`/api/admin/schedule/${instanceId}/attendance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    decisions: Object.entries(marks).map(([userId, status]) => ({ userId, status })),
                    addEmails: addEmail.trim() ? [addEmail.trim()] : [],
                }),
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j.error || "Failed");
            showToast("success", `Confirmed — ${j.present} present.`);
            onClose();
        } catch (e) {
            showToast("error", e instanceof Error ? e.message : "Failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto">
                <h2 className="font-semibold text-ink mb-1">Confirm attendance</h2>
                {info && <p className="text-sm text-ink-subtle mb-4">{info.batchName} · {new Date(info.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>}

                {rows.length === 0 ? (
                    <p className="text-sm text-ink-subtle mb-4">No one tapped Join. Add members below.</p>
                ) : (
                    <ul className="divide-y divide-hairline mb-4">
                        {rows.map((a) => (
                            <li key={a.userId} className="flex items-center justify-between py-2 text-sm">
                                <span>{a.name} <span className="text-ink-subtle">· {a.email}</span></span>
                                <span className="flex gap-1">
                                    {(["PRESENT", "ABSENT"] as const).map((v) => (
                                        <button key={v}
                                            onClick={() => setMarks((m) => ({ ...m, [a.userId]: v }))}
                                            className={`px-2 py-1 rounded text-xs ${marks[a.userId] === v ? (v === "PRESENT" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700") : "bg-black/5 text-ink-subtle"}`}>
                                            {v === "PRESENT" ? "Present" : "Absent"}
                                        </button>
                                    ))}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="flex gap-2 mb-4">
                    <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)}
                        placeholder="Add a member by email (marks present)"
                        className="flex-1 rounded-control border border-hairline px-3 py-1.5 text-sm" />
                </div>

                <div className="flex justify-end gap-2">
                    <ActionButton onClick={onClose}>Cancel</ActionButton>
                    <Button size="sm" loading={busy} onClick={save}>Confirm</Button>
                </div>
            </div>
        </div>
    );
}
