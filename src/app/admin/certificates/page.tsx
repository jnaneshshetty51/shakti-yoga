"use client";

import { useCallback, useEffect, useState } from "react";
import { LuAward } from "react-icons/lu";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";
import { PageHeader, PageLoading, StatusBadge, TableActions, ActionButton } from "@/components/admin/ui";

type Certificate = {
    id: string;
    title: string;
    reason: string | null;
    status: "PENDING" | "APPROVED" | "REVOKED";
    verificationCode: string;
    sourceType: string | null;
    issuedAt: string;
    user: { id: string; name: string; email: string };
    approvedBy: { id: string; name: string } | null;
};

type UserOption = { id: string; name: string; email: string };

export default function AdminCertificatesPage() {
    const [certificates, setCertificates] = useState<Certificate[] | null>(null);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/certificates");
            if (res.ok) setCertificates((await res.json()).certificates || []);
        } catch {
            /* keep showing whatever we last had */
        }
    }, []);

    const loadUsers = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/users");
            if (res.ok) {
                const d = await res.json();
                setUsers((d.users || []).map((u: { id: string; name: string; email: string }) => ({ id: u.id, name: u.name, email: u.email })));
            }
        } catch {
            /* the create-form's student picker just stays empty */
        }
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    useEffect(() => { load(); loadUsers(); }, [load, loadUsers]);

    const setStatus = async (c: Certificate, status: "APPROVED" | "REVOKED") => {
        const res = await fetch(`/api/admin/certificates/${c.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        if (res.ok) load();
    };

    const submitCreate = async (values: EntityValues) => {
        const res = await fetch("/api/admin/certificates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Could not issue certificate");
        }
        setCreating(false);
        load();
    };

    if (!certificates) return <PageLoading title="Certificates" />;

    const columns = [
        { header: "Student", accessor: (c: Certificate) => (
            <div><div className="font-semibold text-ink">{c.user.name}</div><div className="text-xs text-ink-subtle">{c.user.email}</div></div>
        ) },
        { header: "Title", accessor: (c: Certificate) => (
            <div><div className="text-ink">{c.title}</div>{c.sourceType && <div className="text-xs text-ink-subtle">{c.sourceType}</div>}</div>
        ) },
        { header: "Status", accessor: (c: Certificate) => <StatusBadge status={c.status} /> },
        { header: "Issued", accessor: (c: Certificate) => new Date(c.issuedAt).toLocaleDateString("en-IN") },
    ];

    return (
        <div>
            <PageHeader title="Certificates" subtitle="Approve auto-issued certificates or issue one manually." />

            <DTable
                data={certificates}
                columns={columns}
                title="Certificates"
                onCreate={() => setCreating(true)}
                filters={[{ key: "status", label: "Status", options: [
                    { label: "Pending", value: "PENDING" },
                    { label: "Approved", value: "APPROVED" },
                    { label: "Revoked", value: "REVOKED" },
                ] }]}
                actions={(c) => (
                    <TableActions>
                        {c.status === "PENDING" && <ActionButton onClick={() => setStatus(c, "APPROVED")}>Approve</ActionButton>}
                        {c.status !== "REVOKED" && <ActionButton tone="danger" onClick={() => setStatus(c, "REVOKED")}>Revoke</ActionButton>}
                    </TableActions>
                )}
            />

            {creating && (
                <EntityFormModal
                    title="Issue a certificate"
                    onCancel={() => setCreating(false)}
                    onSubmit={submitCreate}
                    fields={[
                        { name: "userId", label: "Student", type: "select", required: true, options: users.map((u) => ({ label: `${u.name} (${u.email})`, value: u.id })) },
                        { name: "title", label: "Title", required: true, placeholder: "e.g. Completed 30-Day Practice Challenge" },
                        { name: "reason", label: "Reason", type: "textarea" },
                    ]}
                />
            )}

            {certificates.length === 0 && (
                <div className="mt-4 flex items-center gap-2 text-sm text-ink-subtle">
                    <LuAward /> No certificates yet — they appear automatically when a member completes a challenge, or you can issue one above.
                </div>
            )}
        </div>
    );
}
