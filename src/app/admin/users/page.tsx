"use client";

import { useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";

export type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'Active' | 'Inactive' | 'Trial';
    plan?: string;
    lastLogin: string;
    joinedAt: string;
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchUsers() {
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
        }
        fetchUsers();
    }, []);
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

    const handleCreate = () => {
        alert("Create User Modal would open here.");
    };

    const handleEdit = (user: User) => {
        alert(`Edit User: ${user.name}`);
    };

    const handleDelete = (user: User) => {
        if (confirm(`Are you sure you want to delete ${user.name}?`)) {
            alert("User deleted (mock).");
        }
    };

    const handleBulkDelete = (ids: string[]) => {
        if (confirm(`Are you sure you want to delete ${ids.length} users?`)) {
            alert(`Deleted users: ${ids.join(', ')} (mock)`);
        }
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
                onCreate={handleCreate}
                onBulkDelete={handleBulkDelete}
                actions={(user) => (
                    <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(user)} className="text-primary hover:text-secondary text-xs font-bold uppercase tracking-wider">Edit</button>
                        <button onClick={() => handleDelete(user)} className="text-red-400 hover:text-red-600 text-xs font-bold uppercase tracking-wider">Delete</button>
                    </div>
                )}
            />
        </div>
    );
}
