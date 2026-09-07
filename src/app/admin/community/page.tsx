"use client";

import { useCallback, useEffect, useState } from "react";
import { LuMessageSquare } from "react-icons/lu";
import { PageHeader, Card, EmptyState, Badge, Button, ActionButton, inputClass } from "@/components/admin/ui";

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
        <div className="max-w-4xl">
            <PageHeader
                title="Community Groups"
                subtitle="WhatsApp groups shown on each member's dashboard by their plan."
            >
                <Button variant={creating ? "secondary" : "primary"} onClick={() => setCreating((c) => !c)}>
                    {creating ? "Cancel" : "New group"}
                </Button>
            </PageHeader>

            {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{err}</div>}

            {creating && (
                <Card padded className="mb-6">
                    <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
                        <input required placeholder="Group name" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} className={inputClass} />
                        <select value={newForm.role} onChange={(e) => setNewForm({ ...newForm, role: e.target.value })} className={inputClass}>
                            {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>)}
                        </select>
                        <input required placeholder="https://chat.whatsapp.com/…" value={newForm.link} onChange={(e) => setNewForm({ ...newForm, link: e.target.value })} className={`sm:col-span-2 ${inputClass}`} />
                        <textarea placeholder="Pinned message (optional)" value={newForm.message} onChange={(e) => setNewForm({ ...newForm, message: e.target.value })} className={`sm:col-span-2 h-20 ${inputClass}`} />
                        <button className="sm:col-span-2 sm:w-auto px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">Create group</button>
                    </form>
                </Card>
            )}

            {loading ? (
                <p className="text-gray-500">Loading…</p>
            ) : groups.length === 0 ? (
                <Card><EmptyState icon={LuMessageSquare} title="No groups yet" hint="Create one so members have somewhere to get class links." /></Card>
            ) : (
                <div className="grid gap-4">
                    {groups.map((g) => (
                        <Card key={g.id} padded className={g.active ? "" : "opacity-60"}>
                            {editingId === g.id ? (
                                <div className="space-y-3">
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputClass} placeholder="Name" />
                                        <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className={inputClass}>
                                            {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>)}
                                        </select>
                                    </div>
                                    <input value={editForm.link} onChange={(e) => setEditForm({ ...editForm, link: e.target.value })} className={inputClass} placeholder="WhatsApp link" />
                                    <textarea value={editForm.message} onChange={(e) => setEditForm({ ...editForm, message: e.target.value })} className={`h-20 ${inputClass}`} placeholder="Pinned message" />
                                    <label className="flex items-center gap-2 text-sm text-gray-600">
                                        <input type="checkbox" className="accent-primary" checked={editForm.active} onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} /> Active
                                    </label>
                                    <div className="flex gap-2">
                                        <button onClick={() => save(g.id)} className="px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">Save</button>
                                        <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start gap-3 mb-3">
                                        <div>
                                            <h2 className="font-bold text-lg text-gray-800">{g.name}{!g.active && <span className="ml-2 text-xs text-gray-400 font-normal">(inactive)</span>}</h2>
                                            <Badge tone="gray" className="mt-1">{ROLE_LABEL[g.role] || g.role}</Badge>
                                        </div>
                                        <div className="flex gap-3 shrink-0">
                                            <ActionButton onClick={() => startEdit(g)}>Edit</ActionButton>
                                            <ActionButton tone="danger" onClick={() => remove(g)}>Delete</ActionButton>
                                        </div>
                                    </div>
                                    <a href={g.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">{g.whatsappLink}</a>
                                    {g.pinnedMessage && (
                                        <div className="mt-3 bg-accent/20 p-3 rounded-xl border border-accent/30 text-sm text-gray-700">{g.pinnedMessage}</div>
                                    )}
                                </>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
