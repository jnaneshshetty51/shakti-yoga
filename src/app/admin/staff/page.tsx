"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Staff {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    photoUrl: string | null;
    title: string;
    bio: string;
    specialties: string[];
    yearsExperience: number | null;
    displayOrder: number;
    publicVisible: boolean;
    classesTaught: number;
    sessionsTaught: number;
    availabilityWindows: number;
}

const ROLE_LABEL: Record<string, string> = {
    TEACHER: "Teacher",
    STAFF_ADMIN: "Staff admin",
    SUPER_ADMIN: "Super admin",
};

const BLANK = {
    name: "", email: "", role: "TEACHER", phone: "",
    title: "", bio: "", specialties: "", yearsExperience: "", displayOrder: "0", publicVisible: true,
};

function PhotoInput({ current, onFile }: { current: string | null; onFile: (f: File) => void }) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <button
            type="button"
            onClick={() => ref.current?.click()}
            className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center text-gray-400 text-2xl shrink-0 hover:border-primary"
            title="Upload photo"
        >
            {current
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={current} alt="" className="w-full h-full object-cover" />
                : "＋"}
            <input
                ref={ref}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
            />
        </button>
    );
}

export default function AdminStaffPage() {
    const [staff, setStaff] = useState<Staff[]>([]);
    const [roles, setRoles] = useState<string[]>(["TEACHER", "STAFF_ADMIN"]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");

    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ ...BLANK });
    const [newPhoto, setNewPhoto] = useState<File | null>(null);
    const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ ...BLANK });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/staff");
            const data = await res.json();
            if (res.ok) { setStaff(data.staff || []); setRoles(data.roles || roles); }
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => { load(); }, [load]);

    async function uploadPhoto(staffId: string, file: File) {
        const fd = new FormData();
        fd.append("staffId", staffId);
        fd.append("file", file);
        const res = await fetch("/api/admin/staff/photo", { method: "POST", body: fd });
        if (!res.ok) throw new Error((await res.json()).error || "Photo upload failed");
    }

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(""); setMsg(""); setBusy(true);
        try {
            const res = await fetch("/api/admin/staff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    specialties: form.specialties,
                    yearsExperience: form.yearsExperience,
                    displayOrder: form.displayOrder,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not add staff");
            if (newPhoto) await uploadPhoto(data.staff.id, newPhoto).catch((e2) => setErr(String(e2.message)));
            setMsg(`${form.name} added. A set-password email was sent to ${form.email}.`);
            setForm({ ...BLANK }); setNewPhoto(null); setNewPhotoPreview(null); setCreating(false);
            load();
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Could not add staff");
        } finally {
            setBusy(false);
        }
    };

    const startEdit = (s: Staff) => {
        setEditingId(s.id);
        setEditForm({
            name: s.name, email: s.email, role: s.role, phone: s.phone,
            title: s.title, bio: s.bio, specialties: s.specialties.join(", "),
            yearsExperience: s.yearsExperience?.toString() ?? "", displayOrder: s.displayOrder.toString(),
            publicVisible: s.publicVisible,
        });
    };

    const saveEdit = async (id: string) => {
        setErr("");
        const res = await fetch("/api/admin/staff", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...editForm }),
        });
        if (!res.ok) { setErr((await res.json()).error || "Save failed"); return; }
        setEditingId(null);
        load();
    };

    const changePhoto = async (s: Staff, file: File) => {
        setErr("");
        try {
            await uploadPhoto(s.id, file);
            load();
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : "Photo upload failed");
        }
    };

    const removePhoto = async (s: Staff) => {
        await fetch(`/api/admin/staff/photo?staffId=${s.id}`, { method: "DELETE" });
        load();
    };

    const remove = async (s: Staff) => {
        if (!confirm(`Remove ${s.name}? This deletes their account.`)) return;
        const res = await fetch(`/api/admin/staff?id=${s.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) { setErr(data.error || "Could not remove"); return; }
        load();
    };

    return (
        <div className="p-4 sm:p-8 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="font-serif text-2xl sm:text-3xl text-primary">Staff &amp; Teachers</h1>
                    <p className="text-sm text-gray-500">Accounts, photos and bios for teachers and admins.</p>
                </div>
                <button onClick={() => { setCreating((c) => !c); setErr(""); }} className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-secondary">
                    {creating ? "Cancel" : "Add staff"}
                </button>
            </div>

            {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">{msg}</div>}
            {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm">{err}</div>}

            {creating && (
                <form onSubmit={create} className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
                    <div className="flex gap-4 items-start">
                        <PhotoInput
                            current={newPhotoPreview}
                            onFile={(f) => { setNewPhoto(f); setNewPhotoPreview(URL.createObjectURL(f)); }}
                        />
                        <div className="grid sm:grid-cols-2 gap-3 flex-1">
                            <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="p-2.5 border border-gray-200 rounded text-sm" />
                            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="p-2.5 border border-gray-200 rounded text-sm" />
                            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="p-2.5 border border-gray-200 rounded text-sm">
                                {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>)}
                            </select>
                            <input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="p-2.5 border border-gray-200 rounded text-sm" />
                            <input placeholder='Title, e.g. "Senior Yoga Therapist"' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="sm:col-span-2 p-2.5 border border-gray-200 rounded text-sm" />
                            <input placeholder="Specialties, comma separated" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} className="sm:col-span-2 p-2.5 border border-gray-200 rounded text-sm" />
                            <input type="number" min={0} max={80} placeholder="Years of experience" value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })} className="p-2.5 border border-gray-200 rounded text-sm" />
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input type="checkbox" checked={form.publicVisible} onChange={(e) => setForm({ ...form, publicVisible: e.target.checked })} /> Show on public site
                            </label>
                            <textarea placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="sm:col-span-2 p-2.5 border border-gray-200 rounded text-sm h-24" />
                        </div>
                    </div>
                    <button disabled={busy} className="mt-4 px-6 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-secondary disabled:opacity-60">
                        {busy ? "Adding…" : "Add staff member"}
                    </button>
                </form>
            )}

            {loading ? (
                <p className="text-gray-500">Loading…</p>
            ) : staff.length === 0 ? (
                <p className="text-gray-400 italic">No staff yet.</p>
            ) : (
                <div className="grid gap-4">
                    {staff.map((s) => (
                        <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-5">
                            {editingId === s.id ? (
                                <div className="space-y-3">
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="p-2.5 border border-gray-200 rounded text-sm" placeholder="Name" />
                                        <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="p-2.5 border border-gray-200 rounded text-sm">
                                            {["TEACHER", "STAFF_ADMIN", "SUPER_ADMIN"].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                                        </select>
                                        <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="p-2.5 border border-gray-200 rounded text-sm" placeholder="Phone" />
                                        <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="p-2.5 border border-gray-200 rounded text-sm" placeholder="Title" />
                                        <input value={editForm.specialties} onChange={(e) => setEditForm({ ...editForm, specialties: e.target.value })} className="sm:col-span-2 p-2.5 border border-gray-200 rounded text-sm" placeholder="Specialties (comma separated)" />
                                        <input type="number" min={0} max={80} value={editForm.yearsExperience} onChange={(e) => setEditForm({ ...editForm, yearsExperience: e.target.value })} className="p-2.5 border border-gray-200 rounded text-sm" placeholder="Years experience" />
                                        <input type="number" value={editForm.displayOrder} onChange={(e) => setEditForm({ ...editForm, displayOrder: e.target.value })} className="p-2.5 border border-gray-200 rounded text-sm" placeholder="Display order" />
                                    </div>
                                    <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} className="w-full p-2.5 border border-gray-200 rounded text-sm h-24" placeholder="Bio" />
                                    <label className="flex items-center gap-2 text-sm text-gray-600">
                                        <input type="checkbox" checked={editForm.publicVisible} onChange={(e) => setEditForm({ ...editForm, publicVisible: e.target.checked })} /> Show on public site
                                    </label>
                                    <div className="flex gap-3">
                                        <button onClick={() => saveEdit(s.id)} className="px-5 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-secondary">Save</button>
                                        <button onClick={() => setEditingId(null)} className="px-5 py-2 border border-gray-200 text-gray-600 text-xs font-bold uppercase tracking-widest rounded hover:bg-gray-50">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-4">
                                    <div className="shrink-0">
                                        <PhotoInput current={s.photoUrl} onFile={(f) => changePhoto(s, f)} />
                                        {s.photoUrl && (
                                            <button onClick={() => removePhoto(s)} className="block mt-1 text-[10px] text-gray-400 hover:text-red-500 uppercase tracking-wider">remove</button>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <h2 className="font-bold text-lg text-gray-800">{s.name}
                                                    {!s.publicVisible && <span className="ml-2 text-xs text-gray-400 font-normal">(hidden)</span>}
                                                </h2>
                                                <p className="text-sm text-gray-500">{s.title || ROLE_LABEL[s.role] || s.role}</p>
                                            </div>
                                            <div className="flex gap-3 shrink-0">
                                                <button onClick={() => startEdit(s)} className="text-xs font-bold text-secondary hover:text-primary uppercase tracking-widest">Edit</button>
                                                <button onClick={() => remove(s)} className="text-xs font-bold text-red-400 hover:text-red-600 uppercase tracking-widest">Remove</button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded uppercase tracking-wider font-bold">{ROLE_LABEL[s.role] || s.role}</span>
                                            <span>{s.email}</span>
                                            {s.yearsExperience != null && <span>{s.yearsExperience} yrs</span>}
                                        </div>
                                        {s.specialties.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {s.specialties.map((sp) => (
                                                    <span key={sp} className="text-[11px] bg-accent/40 text-secondary px-2 py-0.5 rounded">{sp}</span>
                                                ))}
                                            </div>
                                        )}
                                        {s.bio && <p className="text-sm text-gray-600 mt-2 line-clamp-3">{s.bio}</p>}
                                        <div className="text-xs text-gray-400 mt-2">
                                            {s.classesTaught} class batch(es) · {s.sessionsTaught} session(s) · {s.availabilityWindows} availability window(s)
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Link href="/admin" className="inline-block mt-8 text-sm font-bold text-text/50 hover:text-primary uppercase tracking-widest">← Dashboard</Link>
        </div>
    );
}
