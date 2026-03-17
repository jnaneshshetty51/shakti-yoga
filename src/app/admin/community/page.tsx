"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export type CommunityGroup = {
    id: string;
    name: string;
    role: string;
    whatsappLink: string;
    pinnedMessage: string;
};

export default function AdminCommunityPage() {
    const [groups, setGroups] = useState<CommunityGroup[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ link: string; message: string }>({ link: "", message: "" });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchGroups() {
            try {
                const response = await fetch('/api/admin/community');
                if (response.ok) {
                    const data = await response.json();
                    setGroups(data.groups || []);
                }
            } catch (error) {
                console.error('Failed to fetch community groups:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchGroups();
    }, []);

    const handleEdit = (group: CommunityGroup) => {
        setEditingId(group.id);
        setEditForm({ link: group.whatsappLink, message: group.pinnedMessage });
    };

    const handleSave = async (id: string) => {
        try {
            const response = await fetch('/api/admin/community', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id,
                    whatsappLink: editForm.link,
                    pinnedMessage: editForm.message,
                }),
            });

            if (response.ok) {
                setGroups(prev => prev.map(g => g.id === id ? { ...g, whatsappLink: editForm.link, pinnedMessage: editForm.message } : g));
                setEditingId(null);
            } else {
                alert('Failed to update group');
            }
        } catch (error) {
            console.error('Failed to update group:', error);
            alert('Failed to update group');
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="font-serif text-3xl text-primary">Community Management</h1>
                    <Link href="/admin" className="text-sm font-bold text-text/50 hover:text-primary uppercase tracking-widest">
                        ← Back to Dashboard
                    </Link>
                </div>
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="font-serif text-3xl text-primary">Community Management</h1>
                <Link href="/admin" className="text-sm font-bold text-text/50 hover:text-primary uppercase tracking-widest">
                    ← Back to Dashboard
                </Link>
            </div>

            <div className="grid gap-6">
                {groups.map((group) => (
                    <div key={group.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="font-bold text-xl text-gray-800">{group.name}</h2>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded">
                                    Role: {group.role}
                                </span>
                            </div>
                            {editingId !== group.id && (
                                <button
                                    onClick={() => handleEdit(group)}
                                    className="text-sm font-bold text-secondary hover:text-primary uppercase tracking-widest"
                                >
                                    Edit
                                </button>
                            )}
                        </div>

                        {editingId === group.id ? (
                            <div className="space-y-4 animate-in fade-in">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">WhatsApp Link</label>
                                    <input
                                        type="text"
                                        value={editForm.link}
                                        onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Pinned Message</label>
                                    <textarea
                                        value={editForm.message}
                                        onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary h-24"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleSave(group.id)}
                                        className="px-6 py-2 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors text-sm"
                                    >
                                        Save Changes
                                    </button>
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="px-6 py-2 border border-gray-200 text-gray-600 font-bold uppercase tracking-widest rounded hover:bg-gray-50 transition-colors text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="font-bold">Link:</span>
                                    <a href={group.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate max-w-md block">
                                        {group.whatsappLink}
                                    </a>
                                </div>
                                <div className="bg-accent/10 p-4 rounded border border-accent/20">
                                    <span className="block text-xs font-bold text-accent uppercase tracking-widest mb-1">Pinned Message</span>
                                    <p className="text-sm text-gray-700">{group.pinnedMessage}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
