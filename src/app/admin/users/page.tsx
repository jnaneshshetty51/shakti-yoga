"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";
import { useToast } from "@/components/admin/Toast";
import { PageHeader, PageLoading, Badge, StatusBadge, TableActions, ActionButton } from "@/components/admin/ui";

const ROLE_OPTIONS = [
    { label: "Super Admin", value: "SUPER_ADMIN" },
    { label: "Staff Admin", value: "STAFF_ADMIN" },
    { label: "Teacher", value: "TEACHER" },
    { label: "Everyday Member", value: "MEMBER_EVERYDAY" },
    { label: "Therapy Member", value: "MEMBER_THERAPY" },
    { label: "Trial", value: "TRIAL" },
    { label: "Visitor", value: "VISITOR" },
];

export type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    credits?: number;
    active?: boolean;
    phone?: string | null;
    country?: string | null;
    status: 'Active' | 'Inactive' | 'Trial';
    plan?: string;
    lastLogin: string;
    joinedAt: string;
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<User | null>(null);
    const { showToast } = useToast();

    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    const columns = [
        { header: "Name", accessor: "name" as keyof User, className: "font-bold text-gray-800", sortable: true },
        { header: "Email", accessor: "email" as keyof User, sortable: true },
        {
            header: "Role",
            accessor: (user: User) => (
                <Badge tone="gray" className="capitalize">
                    {user.role.replace('member_', '').replace('_', ' ').toLowerCase()}
                </Badge>
            ),
            sortable: true
        },
        {
            header: "Status",
            accessor: (user: User) => <StatusBadge status={user.status} />,
            sortable: true
        },
        { header: "Last Login", accessor: "lastLogin" as keyof User, sortable: true },
    ];

    const filters = [
        {
            key: 'status',
            label: 'Status',
            options: [
                { label: 'Active', value: 'Active' },
                { label: 'Trial', value: 'Trial' },
                { label: 'Inactive', value: 'Inactive' },
            ]
        },
        {
            key: 'role',
            label: 'Role',
            options: [
                { label: 'Everyday Yoga', value: 'member_everyday' },
                { label: 'Yoga Therapy', value: 'member_therapy' },
                { label: 'Trial User', value: 'trial' },
            ]
        }
    ];

    const handleDelete = async (user: User) => {
        if (!confirm(`Delete ${user.name}? This removes their bookings, subscription and payments too.`)) return;
        const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast('error', data.error || 'Could not delete user');
            return;
        }
        showToast('success', `${user.name} deleted`);
        fetchUsers();
    };

    const handleBulkDelete = async (ids: string[]) => {
        if (!confirm(`Delete ${ids.length} users?`)) return;
        const results = await Promise.all(ids.map(id => fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })));
        const failed = results.filter(r => !r.ok).length;
        showToast(failed ? 'warning' : 'success', failed ? `${failed} of ${ids.length} could not be deleted` : `${ids.length} users deleted`);
        fetchUsers();
    };

    const submitEdit = async (values: EntityValues) => {
        const res = await fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: editing?.id,
                name: values.name,
                role: values.role,
                credits: values.credits,
                phone: values.phone,
                country: values.country,
            }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Update failed');
        }
        setEditing(null);
        fetchUsers();
    };

    const toggleActive = async (user: User) => {
        const next = !(user.active ?? true);
        if (!confirm(`${next ? 'Reactivate' : 'Deactivate'} ${user.name}? ${next ? '' : 'They will be signed out and blocked from logging in.'}`)) return;
        const res = await fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: user.id, active: next }),
        });
        if (!res.ok) {
            showToast('error', (await res.json().catch(() => ({}))).error || 'Could not update');
            return;
        }
        showToast('success', next ? `${user.name} reactivated` : `${user.name} deactivated`);
        fetchUsers();
    };

    if (loading) return <PageLoading title="User Management" />;

    return (
        <div>
            <PageHeader title="User Management" subtitle="Manage all registered users, members, and staff." />

            <DTable
                data={users}
                columns={columns}
                title="All Users"
                searchable={true}
                filters={filters}
                enableBulkActions={true}
                onBulkDelete={handleBulkDelete}
                actions={(user) => (
                    <TableActions>
                        <ActionButton onClick={() => setEditing(user)}>Edit</ActionButton>
                        <ActionButton onClick={() => toggleActive(user)}>
                            {(user.active ?? true) ? "Deactivate" : "Reactivate"}
                        </ActionButton>
                        <ActionButton tone="danger" onClick={() => handleDelete(user)}>Delete</ActionButton>
                    </TableActions>
                )}
            />

            {editing && (
                <EntityFormModal
                    title={`Edit ${editing.name}`}
                    submitLabel="Save"
                    onCancel={() => setEditing(null)}
                    onSubmit={submitEdit}
                    fields={[
                        { name: "name", label: "Name", required: true },
                        { name: "role", label: "Role", type: "select", required: true, options: ROLE_OPTIONS },
                        { name: "credits", label: "1:1 Session Credits", type: "number" },
                        { name: "phone", label: "Phone" },
                        { name: "country", label: "Country" },
                    ]}
                    initial={{
                        name: editing.name,
                        role: editing.role.toUpperCase(),
                        credits: editing.credits ?? 0,
                        phone: editing.phone ?? "",
                        country: editing.country ?? "",
                    }}
                />
            )}
        </div>
    );
}
