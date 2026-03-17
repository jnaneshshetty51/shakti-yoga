"use client";

import { useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";

export type ClassBatch = {
    id: string;
    name: string;
    time: string;
    days: string[];
    teacher: string;
    active: boolean;
};

export default function AdminClassesPage() {
    const [batches, setBatches] = useState<ClassBatch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBatches() {
            try {
                const response = await fetch('/api/admin/classes');
                if (response.ok) {
                    const data = await response.json();
                    setBatches(data.batches || []);
                }
            } catch (error) {
                console.error('Failed to fetch classes:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchBatches();
    }, []);
    const columns = [
        { header: "Batch Name", accessor: "name" as keyof ClassBatch, className: "font-bold text-gray-800" },
        { header: "Time", accessor: "time" as keyof ClassBatch },
        {
            header: "Days",
            accessor: (batch: ClassBatch) => (
                <div className="flex gap-1">
                    {batch.days.map(d => (
                        <span key={d} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] uppercase text-gray-600">{d}</span>
                    ))}
                </div>
            )
        },
        { header: "Teacher", accessor: "teacher" as keyof ClassBatch },
        {
            header: "Status",
            accessor: (batch: ClassBatch) => (
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${batch.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {batch.active ? 'Active' : 'Inactive'}
                </span>
            )
        },
    ];

    const handleCreate = () => {
        alert("Create Batch Modal would open here.");
    };

    if (loading) {
        return (
            <div>
                <div className="mb-8">
                    <h1 className="font-serif text-3xl text-gray-800 mb-2">Class Management</h1>
                    <p className="text-gray-500">Manage recurring class batches and schedules.</p>
                </div>
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="font-serif text-3xl text-gray-800 mb-2">Class Management</h1>
                <p className="text-gray-500">Manage recurring class batches and schedules.</p>
            </div>

            <DTable
                data={batches}
                columns={columns}
                title="Class Batches"
                onCreate={handleCreate}
                actions={(batch) => (
                    <div className="flex justify-end gap-2">
                        <button className="text-primary hover:text-secondary text-xs font-bold uppercase tracking-wider">Edit</button>
                        <button className="text-gray-400 hover:text-gray-600 text-xs font-bold uppercase tracking-wider">Attendance</button>
                    </div>
                )}
            />
        </div>
    );
}
