"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import DTable from "@/components/admin/DTable";
import { useToast } from "@/components/admin/Toast";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, PageLoading, Badge, TableActions, ActionButton, labelClass, inputClass, useConfirmDialog } from "@/components/admin/ui";

export type CorporateLead = {
    id: string;
    companyName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    employeeCount: number | null;
    requirement: string | null;
    programInterest: string | null;
    status: 'NEW' | 'CONTACTED' | 'DISCUSSION' | 'PROPOSAL' | 'CONFIRMED' | 'PAYMENT' | 'COMPLETED' | 'LOST';
    dealValue: number | null;
    notes: string | null;
    createdAt: string;
    assignedTo: { id: string; name: string } | null;
    _count: { activities: number };
};

const STATUS_TONE = {
    NEW: "blue", CONTACTED: "amber", DISCUSSION: "amber", PROPOSAL: "purple",
    CONFIRMED: "green", PAYMENT: "green", COMPLETED: "green", LOST: "red",
} as const;

const BLANK = {
    companyName: "", contactName: "", contactEmail: "", contactPhone: "",
    employeeCount: "", requirement: "", programInterest: "", status: "NEW",
    dealValue: "", notes: "", assignedToId: "",
};

const PAGE_SIZE = 25;

function CorporateDashboard({ embedded = false }: { embedded?: boolean }) {
    const { showToast } = useToast();
    const { confirm, dialog } = useConfirmDialog();
    const [leads, setLeads] = useState<CorporateLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ ...BLANK });
    const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
            if (search) params.set('q', search);
            if (statusFilter) params.set('status', statusFilter);
            const res = await fetch(`/api/admin/corporate?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []);
                setTotalCount(data.totalCount ?? 0);
            }
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    const fetchStaffList = useCallback(async () => {
        const res = await fetch('/api/admin/users');
        if (res.ok) {
            const data = await res.json();
            setStaffList((data.users || []).filter((u: { role: string }) =>
                ['SUPER_ADMIN', 'STAFF_ADMIN'].includes(String(u.role).toUpperCase())));
        }
    }, []);

    useEffect(() => { fetchLeads(); }, [fetchLeads]);
    useEffect(() => { fetchStaffList(); }, [fetchStaffList]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const url = isEditMode ? `/api/admin/corporate/${editingId}` : '/api/admin/corporate';
        const method = isEditMode ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} lead`);
            setIsModalOpen(false);
            setEditingId(null);
            showToast('success', `Corporate lead ${isEditMode ? 'updated' : 'created'}`);
            fetchLeads();
        } catch (err) {
            showToast('error', err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreate = () => { setIsEditMode(false); setFormData({ ...BLANK }); setIsModalOpen(true); };

    const handleEdit = (lead: CorporateLead) => {
        setFormData({
            companyName: lead.companyName, contactName: lead.contactName, contactEmail: lead.contactEmail,
            contactPhone: lead.contactPhone || '', employeeCount: lead.employeeCount?.toString() || '',
            requirement: lead.requirement || '', programInterest: lead.programInterest || '',
            status: lead.status, dealValue: lead.dealValue?.toString() || '', notes: lead.notes || '',
            assignedToId: lead.assignedTo?.id || '',
        });
        setEditingId(lead.id);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (lead: CorporateLead) => {
        const ok = await confirm({
            title: `Delete corporate lead: ${lead.companyName}?`,
            confirmLabel: "Delete",
            tone: "danger",
        });
        if (!ok) return;
        const res = await fetch(`/api/admin/corporate/${lead.id}`, { method: 'DELETE' });
        if (!res.ok) { showToast('error', 'Failed to delete'); return; }
        showToast('success', 'Deleted');
        // Removing the last row on a page beyond the first would otherwise
        // leave the admin looking at a page that no longer exists.
        if (leads.length === 1 && page > 1) setPage((p) => p - 1);
        else fetchLeads();
    };

    const columns = [
        {
            header: "Company", accessor: (l: CorporateLead) => (
                <div>
                    <div className="font-bold text-gray-800">{l.companyName}</div>
                    <div className="text-xs text-gray-500">{l.contactName} · {l.contactEmail}</div>
                </div>
            ),
        },
        { header: "Employees", accessor: (l: CorporateLead) => l.employeeCount ?? "—" },
        {
            // Renders a derived Badge, not a raw sortable field — see the
            // note on the reference Users page conversion for why this
            // deliberately isn't marked sortable.
            header: "Status", accessor: (l: CorporateLead) => <Badge tone={STATUS_TONE[l.status]}>{l.status}</Badge>,
        },
        { header: "Assigned To", accessor: (l: CorporateLead) => l.assignedTo?.name || <span className="text-gray-400 italic">Unassigned</span> },
        {
            header: "Last Activity", accessor: (l: CorporateLead) => (
                <div>
                    <div className="text-sm">{formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}</div>
                    <div className="text-xs text-gray-500">{l._count.activities} interactions</div>
                </div>
            ),
        },
    ];

    if (loading) return <PageLoading title="Corporate" />;

    return (
        <div>
            {dialog}
            {!embedded && <PageHeader title="Corporate Wellness" subtitle="B2B wellness proposals, corporate workshops, and institutional wellness contracts." />}

            <DTable
                data={leads}
                columns={columns}
                title="Corporate Leads"
                onCreate={handleCreate}
                filters={[{ key: "status", label: "Status", options: Object.keys(STATUS_TONE).map((s) => ({ label: s, value: s })) }]}
                server={{
                    page,
                    pageSize: PAGE_SIZE,
                    totalCount,
                    onPageChange: setPage,
                    onSearchChange: (q) => { setSearch(q); setPage(1); },
                    onFilterChange: (key, value) => {
                        if (key === "status") setStatusFilter(value);
                        setPage(1);
                    },
                }}
                actions={(lead) => (
                    <TableActions>
                        <a href={`/admin/corporate/${lead.id}`} className="text-xs font-semibold text-brand hover:text-brand-strong">View</a>
                        <ActionButton onClick={() => handleEdit(lead)}>Update</ActionButton>
                        <ActionButton tone="danger" onClick={() => handleDelete(lead)}>Delete</ActionButton>
                    </TableActions>
                )}
            />

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                            <h2 className="font-serif text-xl text-gray-800">{isEditMode ? 'Update Corporate Lead' : 'Add Corporate Lead'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 -mr-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Company</label>
                                    <input required value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Contact name</label>
                                    <input required value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} className={inputClass} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Email</label>
                                    <input required type="email" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Phone</label>
                                    <input value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} className={inputClass} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Employees</label>
                                    <input type="number" min={0} value={formData.employeeCount} onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Program interest</label>
                                    <input value={formData.programInterest} onChange={(e) => setFormData({ ...formData, programInterest: e.target.value })} className={inputClass} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Status</label>
                                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={inputClass}>
                                        {Object.keys(STATUS_TONE).map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Deal value (₹)</label>
                                    <input type="number" min={0} value={formData.dealValue} onChange={(e) => setFormData({ ...formData, dealValue: e.target.value })} className={inputClass} />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Assign to (staff)</label>
                                <select value={formData.assignedToId} onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })} className={inputClass}>
                                    <option value="">Unassigned</option>
                                    {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Requirement</label>
                                <textarea rows={2} value={formData.requirement} onChange={(e) => setFormData({ ...formData, requirement: e.target.value })} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Notes</label>
                                <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className={inputClass} />
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                                    {isSubmitting ? 'Saving…' : (isEditMode ? 'Update' : 'Add Lead')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export function AdminCorporateContent({ embedded = false }: { embedded?: boolean } = {}) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CorporateDashboard embedded={embedded} />
        </Suspense>
    );
}

export default function AdminCorporatePage() {
    return <AdminCorporateContent />;
}
