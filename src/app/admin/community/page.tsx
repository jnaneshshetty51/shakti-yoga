"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export type CommunityGroup = {
    id: string;
    name: string;
    role: string;
    whatsappLink: string;
    pinnedMessage: string;
    active: boolean;
};

const ROLE_LABEL: Record<string, string> = {
    MEMBER_EVERYDAY: "Everyday members",
    MEMBER_THERAPY: "Therapy members",
    TRIAL: "Trial users",
    TEACHER: "Teachers",
};

export default function AdminCommunityPage() {
    const [groups, setGroups] = useState<CommunityGroup[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: "", link: "", message: "", role: "", active: true });
    const [creating, setCreating] = useState(false);
    const [newForm, setNewForm] = useState({ name: "", link: "", message: "", role: "MEMBER_EVERYDAY" });
    const [err, setErr] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/community");
            const data = await res.json();
            if (res.ok) {
                setGroups(data.groups || []);
                setRoles(data.roles || Object.keys(ROLE_LABEL));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const startEdit = (g: CommunityGroup) => {
        setEditingId(g.id);
        setEditForm({ name: g.name, link: g.whatsappLink, message: g.pinnedMessage, role: g.role, active: g.active });
    };

    const save = async (id: string) => {
        setErr("");
        const res = await fetch("/api/admin/community", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id, name: editForm.name, whatsappLink: editForm.link,
                pinnedMessage: editForm.message, role: editForm.role, active: editForm.active,
            }),
        });
        if (!res.ok) { setErr((await res.json()).error || "Save failed"); return; }
        setEditingId(null);
        load();
    };

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr("");
        const res = await fetch("/api/admin/community", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...newForm, whatsappLink: newForm.link, pinnedMessage: newForm.message }),
        });
        if (!res.ok) { setErr((await res.json()).error || "Could not create"); return; }
        setNewForm({ name: "", link: "", message: "", role: "MEMBER_EVERYDAY" });
        setCreating(false);
        load();
    };

    const remove = async (g: CommunityGroup) => {
        if (!confirm(`Delete the "${g.name}" group? Members mapped to this role will see no group until you add another.`)) return;
        await fetch(`/api/admin/community?id=${g.id}`, { method: "DELETE" });
        load();
    };

    return (
        <div className="p-4 sm:p-8 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="font-serif text-2xl sm:text-3xl text-primary">Community Groups</h1>
                    <p className="text-sm text-gray-500">WhatsApp groups shown on each member&apos;s dashboard by their plan.</p>
                </div>
                <button onClick={() => setCreating((c) => !c)} className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-secondary">
                    {creating ? "Cancel" : "New group"}
                </button>
            </div>

            {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm">{err}</div>}

            {creating && (
                <form onSubmit={create} className="bg-white border border-gray-200 rounded-lg p-5 mb-6 grid gap-3 sm:grid-cols-2">
                    <input required placeholder="Group name" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} className="p-2.5 border border-gray-200 rounded text-sm" />
                    <select value={newForm.role} onChange={(e) => setNewForm({ ...newForm, role: e.target.value })} className="p-2.5 border border-gray-200 rounded text-sm">
                        {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>)}
                    </select>
                    <input required placeholder="https://chat.whatsapp.com/…" value={newForm.link} onChange={(e) => setNewForm({ ...newForm, link: e.target.value })} className="sm:col-span-2 p-2.5 border border-gray-200 rounded text-sm" />
                    <textarea placeholder="Pinned message (optional)" value={newForm.message} onChange={(e) => setNewForm({ ...newForm, message: e.target.value })} className="sm:col-span-2 p-2.5 border border-gray-200 rounded text-sm h-20" />
                    <button className="sm:col-span-2 sm:w-auto px-6 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-secondary">Create group</button>
                </form>
            )}

            {loading ? (
                <p className="text-gray-500">Loading…</p>
            ) : groups.length === 0 ? (
                <p className="text-gray-400 italic">No groups yet. Create one so members have somewhere to get class links.</p>
            ) : (
                <div className="grid gap-4">
                    {groups.map((g) => (
                        <div key={g.id} className={`bg-white p-5 rounded-lg shadow-sm border ${g.active ? "border-gray-200" : "border-gray-200 opacity-60"}`}>
                            {editingId === g.id ? (
                                <div className="space-y-3">
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="p-2.5 border border-gray-200 rounded text-sm" placeholder="Name" />
                                        <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="p-2.5 border border-gray-200 rounded text-sm">
                                            {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>)}
                                        </select>
                                    </div>
                                    <input value={editForm.link} onChange={(e) => setEditForm({ ...editForm, link: e.target.value })} className="w-full p-2.5 border border-gray-200 rounded text-sm" placeholder="WhatsApp link" />
                                    <textarea value={editForm.message} onChange={(e) => setEditForm({ ...editForm, message: e.target.value })} className="w-full p-2.5 border border-gray-200 rounded text-sm h-20" placeholder="Pinned message" />
                                    <label className="flex items-center gap-2 text-sm text-gray-600">
                                        <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} /> Active
                                    </label>
                                    <div className="flex gap-3">
                                        <button onClick={() => save(g.id)} className="px-5 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-secondary">Save</button>
                                        <button onClick={() => setEditingId(null)} className="px-5 py-2 border border-gray-200 text-gray-600 text-xs font-bold uppercase tracking-widest rounded hover:bg-gray-50">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h2 className="font-bold text-lg text-gray-800">{g.name}{!g.active && <span className="ml-2 text-xs text-gray-400 font-normal">(inactive)</span>}</h2>
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">{ROLE_LABEL[g.role] || g.role}</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => startEdit(g)} className="text-xs font-bold text-secondary hover:text-primary uppercase tracking-widest">Edit</button>
                                            <button onClick={() => remove(g)} className="text-xs font-bold text-red-400 hover:text-red-600 uppercase tracking-widest">Delete</button>
                                        </div>
                                    </div>
                                    <a href={g.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">{g.whatsappLink}</a>
                                    {g.pinnedMessage && (
                                        <div className="mt-3 bg-accent/10 p-3 rounded border border-accent/20 text-sm text-gray-700">{g.pinnedMessage}</div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Link href="/admin" className="inline-block mt-8 text-sm font-bold text-text/50 hover:text-primary uppercase tracking-widest">← Dashboard</Link>
        </div>
    );
}
