"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import DTable from "@/components/admin/DTable";
import { KanbanBoard } from "@/components/admin/KanbanBoard";
import { StatCard } from "@/components/admin/StatCard";
import { useToast } from "@/components/admin/Toast";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, PageLoading, Badge, TableActions, ActionButton, labelClass, inputClass, useConfirmDialog, Button } from "@/components/admin/ui";
import { LuKanban, LuTable, LuBuilding, LuBriefcase, LuIndianRupee, LuTrophy, LuPlus, LuArrowRight, LuArrowLeft, LuMessageCircle, LuSearch } from "react-icons/lu";

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

type CorporateMetrics = {
    totalDeals: number;
    totalPipelineValue: number;
    wonValue: number;
    stageBreakdown: Record<string, { count: number; value: number }>;
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
    const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
    const [metrics, setMetrics] = useState<CorporateMetrics | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ ...BLANK });
    const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const isKanban = viewMode === "kanban";
            const params = new URLSearchParams({
                page: isKanban ? "1" : String(page),
                pageSize: isKanban ? "250" : String(PAGE_SIZE),
            });
            if (isKanban) params.set('view', 'kanban');
            if (search) params.set('q', search);
            if (statusFilter) params.set('status', statusFilter);
            const res = await fetch(`/api/admin/corporate?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []);
                setTotalCount(data.totalCount ?? 0);
                if (data.metrics) setMetrics(data.metrics);
            }
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter, viewMode]);

    const fetchStaffList = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/staff');
            if (res.ok) {
                const data = await res.json();
                setStaffList((data.staff || []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
            }
        } catch (error) {
            console.error('Failed to fetch staff list:', error);
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

    const handleQuickMoveStage = async (dealId: string, nextStatus: CorporateLead['status']) => {
        setLeads((prev) => prev.map((l) => (l.id === dealId ? { ...l, status: nextStatus } : l)));
        try {
            const res = await fetch(`/api/admin/corporate/${dealId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            });
            if (res.ok) {
                showToast('success', `Deal moved to ${nextStatus.toLowerCase()}`);
            } else {
                showToast('error', 'Failed to update deal stage');
                fetchLeads();
            }
        } catch {
            showToast('error', 'Network error moving deal');
            fetchLeads();
        }
    };

    const inr = (n: number | null) => (n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n));

    const KANBAN_COLUMNS = [
        { id: 'NEW' as const, title: 'New', tone: 'blue' as const },
        { id: 'CONTACTED' as const, title: 'Contacted', tone: 'amber' as const },
        { id: 'DISCUSSION' as const, title: 'Discussion', tone: 'amber' as const },
        { id: 'PROPOSAL' as const, title: 'Proposal', tone: 'purple' as const },
        { id: 'CONFIRMED' as const, title: 'Confirmed', tone: 'green' as const },
        { id: 'PAYMENT' as const, title: 'Payment', tone: 'green' as const },
        { id: 'COMPLETED' as const, title: 'Completed', tone: 'green' as const },
        { id: 'LOST' as const, title: 'Lost', tone: 'red' as const },
    ];

    if (loading && leads.length === 0) return <PageLoading title="Corporate" />;

    return (
        <div>
            {dialog}
            {!embedded && <PageHeader title="Corporate Wellness" subtitle="B2B wellness proposals, corporate workshops, and institutional contracts." />}

            {/* Pipeline KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Active Pipeline Value"
                    value={inr(metrics?.totalPipelineValue ?? 0)}
                    icon={<LuIndianRupee />}
                    accent="blue"
                    change={metrics ? `${metrics.totalDeals} total deals` : undefined}
                />
                <StatCard
                    title="Won Contracts Value"
                    value={inr(metrics?.wonValue ?? 0)}
                    icon={<LuTrophy />}
                    accent="green"
                    suffix=""
                />
                <StatCard
                    title="In Proposal / Discussion"
                    value={
                        (metrics?.stageBreakdown?.PROPOSAL?.count ?? 0) +
                        (metrics?.stageBreakdown?.DISCUSSION?.count ?? 0)
                    }
                    icon={<LuBriefcase />}
                    accent="amber"
                    suffix=" active deals"
                />
                <StatCard
                    title="Corporate Inquiries"
                    value={metrics?.totalDeals ?? totalCount}
                    icon={<LuBuilding />}
                    accent="terracotta"
                    suffix=" companies"
                />
            </div>

            {/* View Mode Switcher and Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 bg-surface p-3 rounded-xl border border-hairline">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">View:</span>
                    <div className="inline-flex rounded-control border border-hairline bg-surface-raised p-0.5">
                        <button
                            onClick={() => setViewMode("kanban")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-control transition-colors ${
                                viewMode === "kanban"
                                    ? "bg-surface text-ink shadow-sm"
                                    : "text-ink-subtle hover:text-ink"
                            }`}
                        >
                            <LuKanban className="w-3.5 h-3.5" /> Pipeline Board
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-control transition-colors ${
                                viewMode === "table"
                                    ? "bg-surface text-ink shadow-sm"
                                    : "text-ink-subtle hover:text-ink"
                            }`}
                        >
                            <LuTable className="w-3.5 h-3.5" /> Data Table
                        </button>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Filter corporate deals..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="text-xs rounded-control border border-hairline bg-surface-raised px-2.5 py-1 pl-7 text-ink placeholder:text-ink-subtle focus:outline-none focus:border-brand w-40 sm:w-56"
                        />
                        <LuSearch className="w-3.5 h-3.5 absolute left-2 top-1.5 text-ink-subtle" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="primary" size="sm" icon={LuPlus} onClick={handleCreate}>
                        Add Corporate Deal
                    </Button>
                </div>
            </div>

            {viewMode === "kanban" ? (
                <KanbanBoard<CorporateLead, CorporateLead['status']>
                    columns={KANBAN_COLUMNS}
                    items={leads}
                    getItemId={(l) => l.id}
                    getItemColumnId={(l) => l.status}
                    onMoveItem={(id, nextColId) => handleQuickMoveStage(id, nextColId)}
                    onAddInColumn={(colId) => {
                        handleCreate();
                        setFormData((prev) => ({ ...prev, status: colId }));
                    }}
                    renderCard={(lead, { prevColId, nextColId, moveToCol }) => {
                        const phoneDigits = lead.contactPhone ? lead.contactPhone.replace(/[^0-9]/g, '') : '';

                        return (
                            <div className="bg-surface rounded-xl p-3.5 border border-hairline shadow-sm hover:shadow-md hover:border-brand/40 transition-all flex flex-col gap-2.5">
                                <div className="flex items-start justify-between gap-2">
                                    <Link
                                        href={`/admin/corporate/${lead.id}`}
                                        className="font-semibold text-sm text-ink hover:text-brand transition-colors line-clamp-1"
                                    >
                                        {lead.companyName}
                                    </Link>
                                    <button
                                        onClick={() => handleEdit(lead)}
                                        className="text-[11px] font-medium text-ink-subtle hover:text-ink transition-colors"
                                    >
                                        Edit
                                    </button>
                                </div>

                                <div className="text-xs text-ink-subtle space-y-0.5">
                                    <div className="font-medium text-ink">{lead.contactName}</div>
                                    <div className="truncate">{lead.contactEmail}</div>
                                    {lead.contactPhone && (
                                        <div className="flex items-center justify-between pt-0.5">
                                            <span>{lead.contactPhone}</span>
                                            {phoneDigits && (
                                                <a
                                                    href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Namaste ${lead.contactName}! Thank you for your inquiry on behalf of ${lead.companyName} regarding Shakti Yoga corporate wellness.`)}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    title="Open WhatsApp Chat"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded"
                                                >
                                                    <LuMessageCircle className="w-3 h-3" /> WhatsApp
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Deal Value & Employees Badge */}
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs font-bold text-ink">
                                        {inr(lead.dealValue)}
                                    </span>
                                    {lead.employeeCount && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-raised border border-hairline text-ink-subtle">
                                            {lead.employeeCount} employees
                                        </span>
                                    )}
                                </div>

                                {/* Requirement preview */}
                                {lead.requirement && (
                                    <p className="text-[11px] text-ink-subtle line-clamp-2 italic bg-surface-raised/50 p-1.5 rounded border border-hairline/40">
                                        &ldquo;{lead.requirement}&rdquo;
                                    </p>
                                )}

                                {/* Owner Bar */}
                                <div className="pt-2 border-t border-hairline/60 flex items-center justify-between text-[11px]">
                                    <span className="text-ink-subtle truncate max-w-[120px]" title={lead.assignedTo?.name || "Unassigned"}>
                                        Owner: {lead.assignedTo ? lead.assignedTo.name : "Unassigned"}
                                    </span>
                                    <span className="text-ink-subtle/70 text-[10px]">
                                        {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                                    </span>
                                </div>

                                {/* Quick Stage Movement Arrows */}
                                <div className="pt-1.5 border-t border-hairline/40 flex items-center justify-between">
                                    {prevColId ? (
                                        <button
                                            onClick={() => moveToCol(prevColId)}
                                            title="Move backward"
                                            className="p-1 rounded text-ink-subtle hover:text-ink hover:bg-surface-raised transition-colors text-xs flex items-center gap-0.5"
                                        >
                                            <LuArrowLeft className="w-3 h-3" />
                                        </button>
                                    ) : <span />}

                                    {nextColId && (
                                        <button
                                            onClick={() => moveToCol(nextColId)}
                                            title="Move forward"
                                            className="p-1 rounded text-ink-subtle hover:text-brand hover:bg-surface-raised transition-colors text-xs flex items-center gap-0.5 font-medium ml-auto"
                                        >
                                            Next Stage <LuArrowRight className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    }}
                />
            ) : (
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
                            <Link href={`/admin/corporate/${lead.id}`} className="text-xs font-semibold text-brand hover:text-brand-strong">View</Link>
                            <ActionButton onClick={() => handleEdit(lead)}>Update</ActionButton>
                            <ActionButton tone="danger" onClick={() => handleDelete(lead)}>Delete</ActionButton>
                        </TableActions>
                    )}
                />
            )}

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
