"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues } from "@/components/admin/EntityFormModal";

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
    status: 'Active' | 'Inactive' | 'Trial';
    plan?: string;
    lastLogin: string;
    joinedAt: string;
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<User | null>(null);

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
                <span className="capitalize bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                    {user.role.replace('member_', '').replace('_', ' ')}
                </span>
            ),
            sortable: true
        },
        {
            header: "Status",
            accessor: (user: User) => (
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${user.status === 'Active' ? 'bg-green-100 text-green-800' :
                        user.status === 'Trial' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-500'
                    }`}>
                    {user.status}
                </span>
            ),
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
            alert(data.error || 'Could not delete user');
            return;
        }
        fetchUsers();
    };

    const handleBulkDelete = async (ids: string[]) => {
        if (!confirm(`Delete ${ids.length} users?`)) return;
        await Promise.all(ids.map(id => fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })));
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
            }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Update failed');
        }
        setEditing(null);
        fetchUsers();
    };

    if (loading) {
        return (
            <div>
                <div className="mb-8">
                    <h1 className="font-serif text-3xl text-gray-800 mb-2">User Management</h1>
                    <p className="text-gray-500">Manage all registered users, members, and staff.</p>
                </div>
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="font-serif text-3xl text-gray-800 mb-2">User Management</h1>
                <p className="text-gray-500">Manage all registered users, members, and staff.</p>
            </div>

            <DTable
                data={users}
                columns={columns}
                title="All Users"
                searchable={true}
                filters={filters}
                enableBulkActions={true}
                onBulkDelete={handleBulkDelete}
                actions={(user) => (
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setEditing(user)} className="text-primary hover:text-secondary text-xs font-bold uppercase tracking-wider">Edit</button>
                        <button onClick={() => handleDelete(user)} className="text-red-400 hover:text-red-600 text-xs font-bold uppercase tracking-wider">Delete</button>
                    </div>
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
                    ]}
                    initial={{
                        name: editing.name,
                        role: editing.role.toUpperCase(),
                        credits: editing.credits ?? 0,
                    }}
                />
            )}
        </div>
    );
}
