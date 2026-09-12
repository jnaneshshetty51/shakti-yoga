"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LuGraduationCap } from "react-icons/lu";
import { PageHeader, Card, EmptyState, Badge, Button, ActionButton, inputClass } from "@/components/admin/ui";
import { useAuth } from "@/context/AuthContext";

const DEPARTMENT_LABEL: Record<string, string> = { CONTENT: "Content Team", SUPPORT: "Support Staff", TRAINER: "Everyday Trainer", THERAPIST: "Yoga Therapist" };

interface Staff {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    department: "CONTENT" | "SUPPORT" | "TRAINER" | "THERAPIST" | null;
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
    name: "", email: "", role: "TEACHER", phone: "", adminDepartment: "",
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
    const { user } = useAuth();
    const isSuper = user?.tier === "super";
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
            name: s.name, email: s.email, role: s.role, phone: s.phone, adminDepartment: s.department ?? "",
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
        <div className="max-w-4xl">
            <PageHeader title="Staff & Teachers" subtitle="Accounts, photos and bios for teachers and admins.">
                <Button variant={creating ? "secondary" : "primary"} onClick={() => { setCreating((c) => !c); setErr(""); }}>
                    {creating ? "Cancel" : "Add staff"}
                </Button>
            </PageHeader>

            {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{msg}</div>}
            {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{err}</div>}

            {creating && (
                <form onSubmit={create} className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5 mb-6">
                    <div className="flex gap-4 items-start">
                        <PhotoInput
                            current={newPhotoPreview}
                            onFile={(f) => { setNewPhoto(f); setNewPhotoPreview(URL.createObjectURL(f)); }}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                            <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
                            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
                            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass}>
                                {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>)}
                            </select>
                            <input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
                            {isSuper && form.role === "STAFF_ADMIN" && (
                                <select value={form.adminDepartment} onChange={(e) => setForm({ ...form, adminDepartment: e.target.value })} className={inputClass}>
                                    <option value="">Full admin access (no department)</option>
                                    <option value="CONTENT">Content Team</option>
                                    <option value="SUPPORT">Support Staff</option>
                                    <option value="TRAINER">Everyday Trainer</option>
                                    <option value="THERAPIST">Yoga Therapist</option>
                                </select>
                            )}
                            <input placeholder='Title, e.g. "Senior Yoga Therapist"' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`sm:col-span-2 ${inputClass}`} />
                            <input placeholder="Specialties, comma separated" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} className={`sm:col-span-2 ${inputClass}`} />
                            <input type="number" min={0} max={80} placeholder="Years of experience" value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })} className={inputClass} />
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input type="checkbox" checked={form.publicVisible} onChange={(e) => setForm({ ...form, publicVisible: e.target.checked })} /> Show on public site
                            </label>
                            <textarea placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={`sm:col-span-2 h-24 ${inputClass}`} />
                        </div>
                    </div>
                    <button disabled={busy} className="mt-4 px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
                        {busy ? "Adding…" : "Add staff member"}
                    </button>
                </form>
            )}

            {loading ? (
                <p className="text-gray-500">Loading…</p>
            ) : staff.length === 0 ? (
                <Card><EmptyState icon={LuGraduationCap} title="No staff yet" hint="Add teachers and admins so they show on the public site and can be scheduled." /></Card>
            ) : (
                <div className="grid gap-4">
                    {staff.map((s) => (
                        <div key={s.id} className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5">
                            {editingId === s.id ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputClass} placeholder="Name" />
                                        <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className={inputClass}>
                                            {["TEACHER", "STAFF_ADMIN", "SUPER_ADMIN"].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                                        </select>
                                        <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className={inputClass} placeholder="Phone" />
                                        {isSuper && editForm.role === "STAFF_ADMIN" && (
                                            <select value={editForm.adminDepartment} onChange={(e) => setEditForm({ ...editForm, adminDepartment: e.target.value })} className={inputClass}>
                                                <option value="">Full admin access (no department)</option>
                                                <option value="CONTENT">Content Team</option>
                                                <option value="SUPPORT">Support Staff</option>
                                    <option value="TRAINER">Everyday Trainer</option>
                                    <option value="THERAPIST">Yoga Therapist</option>
                                            </select>
                                        )}
                                        <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className={inputClass} placeholder="Title" />
                                        <input value={editForm.specialties} onChange={(e) => setEditForm({ ...editForm, specialties: e.target.value })} className={`sm:col-span-2 ${inputClass}`} placeholder="Specialties (comma separated)" />
                                        <input type="number" min={0} max={80} value={editForm.yearsExperience} onChange={(e) => setEditForm({ ...editForm, yearsExperience: e.target.value })} className={inputClass} placeholder="Years experience" />
                                        <input type="number" value={editForm.displayOrder} onChange={(e) => setEditForm({ ...editForm, displayOrder: e.target.value })} className={inputClass} placeholder="Display order" />
                                    </div>
                                    <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} className={`h-24 ${inputClass}`} placeholder="Bio" />
                                    <label className="flex items-center gap-2 text-sm text-gray-600">
                                        <input type="checkbox" checked={editForm.publicVisible} onChange={(e) => setEditForm({ ...editForm, publicVisible: e.target.checked })} /> Show on public site
                                    </label>
                                    <div className="flex gap-3">
                                        <button onClick={() => saveEdit(s.id)} className="px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">Save</button>
                                        <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
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
                                                <ActionButton onClick={() => startEdit(s)}>Edit</ActionButton>
                                                <ActionButton tone="danger" onClick={() => remove(s)}>Remove</ActionButton>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-500">
                                            <Badge tone="gray">{ROLE_LABEL[s.role] || s.role}</Badge>
                                            {s.department && <Badge tone="blue">{DEPARTMENT_LABEL[s.department]}</Badge>}
                                            <span>{s.email}</span>
                                            {s.yearsExperience != null && <span>{s.yearsExperience} yrs</span>}
                                        </div>
                                        {s.specialties.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {s.specialties.map((sp) => (
                                                    <span key={sp} className="text-[11px] bg-accent/40 text-secondary px-2 py-0.5 rounded-full">{sp}</span>
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

        </div>
    );
}
