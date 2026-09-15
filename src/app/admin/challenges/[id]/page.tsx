"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LuArrowLeft } from "react-icons/lu";
import DTable from "@/components/admin/DTable";
import { PageHeader, PageLoading, Badge, TableActions, ActionButton, ErrorState, useConfirmDialog } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

type Participant = {
    id: string; userId: string; name: string; email: string;
    joinedAt: string; completed: boolean; completedAt: string | null; progress: number;
    [key: string]: unknown;
};
type Data = {
    challenge: { id: string; title: string; goalTarget: number; goalLabel: string; startDate: string; endDate: string };
    participants: Participant[];
    totalCount: number;
    completedCount: number;
};

const PAGE_SIZE = 25;

export default function ChallengeParticipantsPage() {
    const { id } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const { confirm, dialog } = useConfirmDialog();
    const [data, setData] = useState<Data | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
            if (search) params.set("q", search);
            const res = await fetch(`/api/admin/challenges/${id}/participants?${params}`);
            if (res.ok) {
                setData(await res.json());
            } else {
                setLoadError(true);
            }
        } catch {
            setLoadError(true);
        }
    }, [id, page, search]);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    useEffect(() => { load(); }, [load]);

    const setComplete = async (p: Participant, completed: boolean) => {
        const res = await fetch(`/api/admin/challenges/${id}/participants`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participantId: p.id, completed }),
        });
        if (!res.ok) return showToast("error", "Failed");
        showToast("success", completed ? `${p.name} marked complete` : `${p.name} reopened`);
        load();
    };

    const remove = async (p: Participant) => {
        const ok = await confirm({
            title: `Remove ${p.name} from this challenge?`,
            confirmLabel: "Remove",
            tone: "danger",
        });
        if (!ok) return;
        const res = await fetch(`/api/admin/challenges/${id}/participants?participantId=${p.id}`, { method: "DELETE" });
        if (!res.ok) return showToast("error", "Failed");
        showToast("success", `${p.name} removed`);
        // Removing the last row on a page beyond the first would otherwise
        // leave the admin looking at a page that no longer exists.
        if (data && data.participants.length === 1 && page > 1) setPage((pg) => pg - 1);
        else load();
    };

    if (loadError) {
        return (
            <div>
                <Link href="/admin/students?tab=challenges" className="inline-flex items-center gap-1 text-sm text-ink-subtle hover:text-ink mb-3">
                    <LuArrowLeft /> Challenges
                </Link>
                <ErrorState message="Could not load this challenge." onRetry={load} />
            </div>
        );
    }

    if (!data) return <PageLoading title="Challenge" />;

    const { challenge, participants, totalCount, completedCount } = data;

    return (
        <div>
            {dialog}
            <Link href="/admin/students?tab=challenges" className="inline-flex items-center gap-1 text-sm text-ink-subtle hover:text-ink mb-3">
                <LuArrowLeft /> Challenges
            </Link>
            <PageHeader
                title={challenge.title}
                subtitle={`Goal: ${challenge.goalTarget} ${challenge.goalLabel} · ${totalCount} joined · ${completedCount} completed`}
            />
            <DTable
                data={participants}
                columns={[
                    { header: "Member", accessor: (p: Participant) => (
                        <div><div className="font-bold text-gray-800">{p.name}</div>
                            <div className="text-xs text-gray-400">{p.email}</div></div>
                    ) },
                    { header: "Progress", accessor: (p: Participant) => (
                        <span className="tabular-nums">{p.progress} / {challenge.goalTarget}</span>
                    ) },
                    { header: "Joined", accessor: (p: Participant) =>
                        new Date(p.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) },
                    { header: "Status", accessor: (p: Participant) =>
                        p.completed ? <Badge tone="green">Completed</Badge> : <Badge tone="gray">In progress</Badge> },
                ]}
                title="Participants"
                server={{
                    page,
                    pageSize: PAGE_SIZE,
                    totalCount,
                    onPageChange: setPage,
                    onSearchChange: (q) => { setSearch(q); setPage(1); },
                }}
                actions={(p: Participant) => (
                    <TableActions>
                        <ActionButton onClick={() => setComplete(p, !p.completed)}>
                            {p.completed ? "Reopen" : "Mark complete"}
                        </ActionButton>
                        <ActionButton tone="danger" onClick={() => remove(p)}>Remove</ActionButton>
                    </TableActions>
                )}
            />
        </div>
    );
}
