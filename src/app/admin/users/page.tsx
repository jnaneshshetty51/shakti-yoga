"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";
import { useToast } from "@/components/admin/Toast";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, PageLoading, Badge, StatusBadge, TableActions, ActionButton, useConfirmDialog } from "@/components/admin/ui";

const BASE_ROLE_OPTIONS = [
    { label: "Teacher", value: "TEACHER" },
    { label: "Everyday Member", value: "MEMBER_EVERYDAY" },
    { label: "Therapy Member", value: "MEMBER_THERAPY" },
    { label: "Trial", value: "TRIAL" },
    { label: "Visitor", value: "VISITOR" },
];
// The server rejects an admin-role change from anyone but a super admin — only
// offer these options in the dropdown when the viewer can actually set them.
const SUPER_ONLY_ROLE_OPTIONS = [
    { label: "Super Admin", value: "SUPER_ADMIN" },
    { label: "Staff Admin", value: "STAFF_ADMIN" },
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

const PAGE_SIZE = 25;

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<User | null>(null);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const { showToast } = useToast();
    const { confirm, dialog } = useConfirmDialog();
    const { user: viewer } = useAuth();
    const ROLE_OPTIONS = viewer?.tier === "super" ? [...SUPER_ONLY_ROLE_OPTIONS, ...BASE_ROLE_OPTIONS] : BASE_ROLE_OPTIONS;

    const fetchUsers = useCallback(async () => {
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
            if (search) params.set('q', search);
            if (statusFilter) params.set('status', statusFilter);
            if (roleFilter) params.set('role', roleFilter);
            if (sort) { params.set('sortKey', sort.key); params.set('sortDir', sort.direction); }
            const response = await fetch(`/api/admin/users?${params}`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
                setTotalCount(data.totalCount ?? 0);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter, roleFilter, sort]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Only Name/Email map to a real, directly-sortable column server-side —
    // Role/Status render a derived Badge (never wired to sort even before
    // this page went server-paginated, since DTable only calls handleSort
    // for string accessors) and Last Login is a formatted relative-time
    // string, not the raw sortable date, so neither offers a sort control.
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
        },
        {
            header: "Status",
            accessor: (user: User) => <StatusBadge status={user.status} />,
        },
        { header: "Last Login", accessor: "lastLogin" as keyof User },
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
        const ok = await confirm({
            title: `Delete ${user.name}?`,
            message: "This removes their bookings, subscription and payments too.",
            confirmLabel: "Delete",
            tone: "danger",
        });
        if (!ok) return;
        const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast('error', data.error || 'Could not delete user');
            return;
        }
        showToast('success', `${user.name} deleted`);
        // Removing the last row on a page beyond the first would otherwise
        // leave the admin looking at a page that no longer exists.
        if (users.length === 1 && page > 1) setPage((p) => p - 1);
        else fetchUsers();
    };

    const handleBulkDelete = async (ids: string[]) => {
        const ok = await confirm({
            title: `Delete ${ids.length} users?`,
            confirmLabel: "Delete",
            tone: "danger",
        });
        if (!ok) return;
        const results = await Promise.all(ids.map(id => fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })));
        const failed = results.filter(r => !r.ok).length;
        const succeeded = ids.length - failed;
        showToast(failed ? 'warning' : 'success', failed ? `${failed} of ${ids.length} could not be deleted` : `${ids.length} users deleted`);
        if (succeeded >= users.length && page > 1) setPage((p) => p - 1);
        else fetchUsers();
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
        const ok = await confirm({
            title: `${next ? 'Reactivate' : 'Deactivate'} ${user.name}?`,
            message: next ? undefined : "They will be signed out and blocked from logging in.",
            confirmLabel: next ? "Reactivate" : "Deactivate",
            tone: next ? "primary" : "danger",
        });
        if (!ok) return;
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
            {dialog}
            <PageHeader title="User Management" subtitle="Manage all registered users, members, and staff." />

            <DTable
                data={users}
                columns={columns}
                title="All Users"
                searchable={true}
                filters={filters}
                enableBulkActions={true}
                onBulkDelete={handleBulkDelete}
                server={{
                    page,
                    pageSize: PAGE_SIZE,
                    totalCount,
                    onPageChange: setPage,
                    onSearchChange: (q) => { setSearch(q); setPage(1); },
                    onFilterChange: (key, value) => {
                        if (key === 'status') setStatusFilter(value);
                        else if (key === 'role') setRoleFilter(value);
                        setPage(1);
                    },
                    onSortChange: (key, direction) => setSort({ key, direction }),
                }}
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
