"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import DTable from "@/components/admin/DTable";
import { KanbanBoard } from "@/components/admin/KanbanBoard";
import { StatCard } from "@/components/admin/StatCard";
import { useToast } from "@/components/admin/Toast";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, PageLoading, Badge, TableActions, ActionButton, labelClass, inputClass, useConfirmDialog, Button } from "@/components/admin/ui";
import {
    LuKanban, LuTable, LuMessageCircle, LuClock, LuUsers, LuTarget,
    LuCalendar, LuArrowRight, LuArrowLeft, LuPlus, LuSearch, LuDownload,
    LuUpload, LuPhoneCall, LuCircleCheck, LuFilter, LuTrash2
} from "react-icons/lu";
import { QuickLogModal, type QuickLogLead } from "@/components/admin/crm/QuickLogModal";
import { WhatsAppTemplateModal, type WhatsAppLead } from "@/components/admin/crm/WhatsAppTemplateModal";
import { LeadImportModal } from "@/components/admin/crm/LeadImportModal";

const PAGE_SIZE = 25;

export type Lead = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    country: string | null;
    source: 'WEBSITE' | 'WHATSAPP' | 'REFERRAL' | 'SOCIAL_MEDIA' | 'OTHER';
    status: 'NEW' | 'CONTACTED' | 'TRIAL' | 'CONVERTED' | 'LOST';
    notes: string | null;
    programInterest: string | null;
    campaign: string | null;
    nextFollowUpAt: string | null;
    trialRequestedAt: string | null;
    trialDate: string | null;
    trialAttended: boolean;
    createdAt: string;
    assignedTo: { id: string, name: string } | null;
    _count: { activities: number };
};

type LeadMetrics = {
    total: number;
    new: number;
    contacted: number;
    trial: number;
    converted: number;
    lost: number;
    overdue: number;
    conversionRate: number;
};

function LeadsDashboard({ embedded = false }: { embedded?: boolean }) {
    const { showToast } = useToast();
    const { confirm, dialog } = useConfirmDialog();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [sourceFilter, setSourceFilter] = useState("");
    const [programFilter, setProgramFilter] = useState("");
    const [staffFilter, setStaffFilter] = useState("");
    const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
    const [metrics, setMetrics] = useState<LeadMetrics | null>(null);

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Quick Log & WhatsApp & Import Modals
    const [quickLogLead, setQuickLogLead] = useState<QuickLogLead | null>(null);
    const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
    const [whatsAppLead, setWhatsAppLead] = useState<WhatsAppLead | null>(null);
    const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);

    // Multi-Select for Bulk Actions
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [bulkSubmitting, setBulkSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        country: '',
        status: 'NEW',
        source: 'WEBSITE',
        programInterest: '',
        campaign: '',
        nextFollowUpAt: '',
        notes: '',
        assignedToId: ''
    });

    const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);

    const fetchLeads = useCallback(async () => {
        try {
            const isKanban = viewMode === "kanban";
            const params = new URLSearchParams({
                page: isKanban ? "1" : String(page),
                pageSize: isKanban ? "250" : String(PAGE_SIZE),
            });
            if (isKanban) params.set("view", "kanban");
            if (search) params.set("search", search);
            if (statusFilter) params.set("status", statusFilter);
            if (sourceFilter) params.set("source", sourceFilter);
            if (programFilter) params.set("programInterest", programFilter);
            if (staffFilter) params.set("assignedToId", staffFilter);

            const response = await fetch(`/api/admin/leads?${params}`);
            if (response.ok) {
                const data = await response.json();
                setLeads(data.leads || []);
                setTotalCount(data.totalCount ?? 0);
                if (data.metrics) setMetrics(data.metrics);
            }
        } catch (error) {
            console.error('Failed to fetch leads:', error);
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter, sourceFilter, programFilter, staffFilter, viewMode]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    useEffect(() => {
        fetchStaffList();
    }, []);

    async function fetchStaffList() {
        try {
            const response = await fetch('/api/admin/staff');
            if (response.ok) {
                const data = await response.json();
                setStaffList((data.staff || []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
            }
        } catch (error) {
            console.error('Failed to fetch staff list:', error);
        }
    }

    const submitLead = async (confirmDuplicate = false) => {
        const url = isEditMode ? `/api/admin/leads/${editingLeadId}` : '/api/admin/leads';
        const method = isEditMode ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, confirmDuplicate }),
        });
        const data = await res.json();

        if (res.status === 409 && data.error === 'duplicate') {
            const proceed = await confirm({
                title: "This email already exists",
                message: `${data.message} Create it anyway?`,
                confirmLabel: "Create anyway",
                tone: "danger",
            });
            if (proceed) return submitLead(true);
            return false;
        }

        if (!res.ok) {
            throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} lead`);
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const done = await submitLead();
            if (!done) return;
            setIsModalOpen(false);
            setEditingLeadId(null);
            showToast('success', `Lead ${isEditMode ? 'updated' : 'created'}`);
            fetchLeads();
        } catch (err) {
            showToast('error', err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreate = () => {
        setIsEditMode(false);
        setFormData({
            name: '',
            email: '',
            phone: '',
            country: '',
            status: 'NEW',
            source: 'WEBSITE',
            programInterest: '',
            campaign: '',
            nextFollowUpAt: '',
            notes: '',
            assignedToId: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (lead: Lead) => {
        setFormData({
            name: lead.name,
            email: lead.email,
            phone: lead.phone || '',
            country: lead.country || '',
            status: lead.status,
            source: lead.source,
            programInterest: lead.programInterest || '',
            campaign: lead.campaign || '',
            nextFollowUpAt: lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : '',
            notes: lead.notes || '',
            assignedToId: lead.assignedTo?.id || ''
        });
        setEditingLeadId(lead.id);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (lead: Lead) => {
        const ok = await confirm({
            title: `Delete lead: ${lead.name}?`,
            confirmLabel: "Delete",
            tone: "danger",
        });
        if (!ok) return;
        try {
            const res = await fetch(`/api/admin/leads/${lead.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete lead');
            showToast('success', `Lead "${lead.name}" deleted`);
            if (leads.length === 1 && page > 1) setPage((p) => p - 1);
            else fetchLeads();
        } catch (err) {
            showToast('error', err instanceof Error ? err.message : 'Something went wrong');
        }
    };

    const statusTone = (status: string) =>
        ({ NEW: "blue", CONTACTED: "amber", TRIAL: "purple", CONVERTED: "green", LOST: "red" } as const)[status] ?? "gray";

    const handleQuickMoveStage = async (leadId: string, nextStatus: Lead['status']) => {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l)));
        try {
            const res = await fetch(`/api/admin/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            });
            if (res.ok) {
                showToast('success', `Lead moved to ${nextStatus.toLowerCase()}`);
            } else {
                showToast('error', 'Failed to update lead stage');
                fetchLeads();
            }
        } catch {
            showToast('error', 'Network error moving lead');
            fetchLeads();
        }
    };

    const handleSnoozeFollowUp = async (leadId: string, daysAhead: number) => {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysAhead);
        const isoString = targetDate.toISOString();

        setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, nextFollowUpAt: isoString } : l)));
        try {
            const res = await fetch(`/api/admin/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nextFollowUpAt: isoString }),
            });
            if (res.ok) {
                showToast('success', `Follow-up postponed by ${daysAhead} day${daysAhead > 1 ? 's' : ''}`);
            } else {
                fetchLeads();
            }
        } catch {
            fetchLeads();
        }
    };

    const handleExportCsv = () => {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (statusFilter) params.set("status", statusFilter);
        if (sourceFilter) params.set("source", sourceFilter);
        if (programFilter) params.set("programInterest", programFilter);
        if (staffFilter) params.set("assignedToId", staffFilter);

        window.open(`/api/admin/leads/export?${params.toString()}`, "_blank");
        showToast("success", "Exporting leads CSV...");
    };

    // Bulk action handlers
    const handleBulkStage = async (status: string) => {
        if (selectedLeadIds.length === 0) return;
        setBulkSubmitting(true);
        try {
            const res = await fetch('/api/admin/leads/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadIds: selectedLeadIds, action: 'update_status', value: status }),
            });
            if (res.ok) {
                showToast('success', `Updated ${selectedLeadIds.length} leads to ${status.toLowerCase()}`);
                setSelectedLeadIds([]);
                fetchLeads();
            }
        } catch {
            showToast('error', 'Bulk update failed');
        } finally {
            setBulkSubmitting(false);
        }
    };

    const handleBulkAssign = async (staffId: string) => {
        if (selectedLeadIds.length === 0) return;
        setBulkSubmitting(true);
        try {
            const res = await fetch('/api/admin/leads/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadIds: selectedLeadIds, action: 'assign_staff', value: staffId }),
            });
            if (res.ok) {
                showToast('success', `Assigned ${selectedLeadIds.length} leads`);
                setSelectedLeadIds([]);
                fetchLeads();
            }
        } catch {
            showToast('error', 'Bulk assignment failed');
        } finally {
            setBulkSubmitting(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedLeadIds.length === 0) return;
        const ok = await confirm({
            title: `Delete ${selectedLeadIds.length} selected leads?`,
            message: "This will permanently remove these leads and their activity logs.",
            confirmLabel: "Delete All",
            tone: "danger",
        });
        if (!ok) return;

        setBulkSubmitting(true);
        try {
            const res = await fetch('/api/admin/leads/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadIds: selectedLeadIds, action: 'delete' }),
            });
            if (res.ok) {
                showToast('success', `Deleted ${selectedLeadIds.length} leads`);
                setSelectedLeadIds([]);
                fetchLeads();
            }
        } catch {
            showToast('error', 'Bulk deletion failed');
        } finally {
            setBulkSubmitting(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedLeadIds.length === leads.length) {
            setSelectedLeadIds([]);
        } else {
            setSelectedLeadIds(leads.map((l) => l.id));
        }
    };

    const toggleSelectLead = (id: string) => {
        setSelectedLeadIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const KANBAN_COLUMNS = [
        { id: 'NEW' as const, title: 'New', tone: 'blue' as const },
        { id: 'CONTACTED' as const, title: 'Contacted', tone: 'amber' as const },
        { id: 'TRIAL' as const, title: 'In Trial', tone: 'purple' as const },
        { id: 'CONVERTED' as const, title: 'Converted', tone: 'green' as const },
        { id: 'LOST' as const, title: 'Lost', tone: 'red' as const },
    ];

    const columns = [
        {
            header: "Select",
            accessor: (lead: Lead) => (
                <input
                    type="checkbox"
                    checked={selectedLeadIds.includes(lead.id)}
                    onChange={() => toggleSelectLead(lead.id)}
                    className="w-4 h-4 rounded border-hairline text-brand focus:ring-brand"
                />
            ),
        },
        {
            header: "Contact Info",
            accessor: (lead: Lead) => (
                <div>
                    <Link href={`/admin/leads/${lead.id}`} className="font-bold text-gray-800 hover:text-brand transition-colors">
                        {lead.name}
                    </Link>
                    <div className="text-xs text-gray-500">{lead.email}</div>
                    {lead.phone && (
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <span>{lead.phone}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setWhatsAppLead(lead);
                                    setIsWhatsAppOpen(true);
                                }}
                                title="Open WhatsApp Template"
                                className="inline-flex items-center text-emerald-600 hover:text-emerald-700"
                            >
                                <LuMessageCircle className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            )
        },
        {
            header: "Program / Source",
            accessor: (lead: Lead) => (
                <div className="space-y-1">
                    {lead.programInterest && (
                        <div className="text-xs font-medium text-ink truncate max-w-[140px]">
                            {lead.programInterest.replace(/_/g, " ")}
                        </div>
                    )}
                    <Badge tone="gray" className="capitalize text-[10px]">
                        {lead.source.replace('_', ' ').toLowerCase()}
                    </Badge>
                </div>
            )
        },
        {
            header: "Status",
            accessor: (lead: Lead) => <Badge tone={statusTone(lead.status)}>{lead.status}</Badge>,
        },
        {
            header: "Assigned To",
            accessor: (lead: Lead) => lead.assignedTo ? lead.assignedTo.name : <span className="text-gray-400 italic text-xs">Unassigned</span>
        },
        {
            header: "Follow-up",
            accessor: (lead: Lead) => {
                if (!lead.nextFollowUpAt) return <span className="text-gray-400 italic text-xs">Not scheduled</span>;
                const due = new Date(lead.nextFollowUpAt);
                const overdue = due.getTime() <= Date.now() && lead.status !== 'CONVERTED' && lead.status !== 'LOST';
                return (
                    <div>
                        <div className={`text-xs font-medium ${overdue ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                            {overdue ? "⚠ Overdue — " : ""}{due.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </div>
                        {overdue && (
                            <div className="flex gap-1 mt-0.5 text-[10px]">
                                <button
                                    onClick={() => handleSnoozeFollowUp(lead.id, 1)}
                                    className="px-1 py-0.2 rounded bg-surface-raised border border-hairline text-ink-subtle hover:text-ink"
                                >
                                    +1d
                                </button>
                                <button
                                    onClick={() => handleSnoozeFollowUp(lead.id, 3)}
                                    className="px-1 py-0.2 rounded bg-surface-raised border border-hairline text-ink-subtle hover:text-ink"
                                >
                                    +3d
                                </button>
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            header: "Interactions",
            accessor: (lead: Lead) => (
                <div>
                    <div className="text-sm">{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</div>
                    <div className="text-xs text-gray-500">{lead._count.activities} logs</div>
                </div>
            )
        }
    ];

    if (loading && leads.length === 0) return <PageLoading title="Leads CRM" />;

    return (
        <div>
            {dialog}

            {/* Quick Log Modal */}
            <QuickLogModal
                lead={quickLogLead}
                isOpen={isQuickLogOpen}
                onClose={() => setIsQuickLogOpen(false)}
                onSuccess={fetchLeads}
            />

            {/* WhatsApp Template Modal */}
            <WhatsAppTemplateModal
                lead={whatsAppLead}
                isOpen={isWhatsAppOpen}
                onClose={() => setIsWhatsAppOpen(false)}
                onLogged={fetchLeads}
            />

            {/* Lead Import Modal */}
            <LeadImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={fetchLeads}
                staffList={staffList}
            />

            {!embedded && (
                <PageHeader
                    title="Leads Pipeline"
                    subtitle="Track, engage, and convert prospective students through an active admissions pipeline."
                />
            )}

            {/* Pipeline KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Total Leads"
                    value={metrics?.total ?? totalCount}
                    icon={<LuUsers />}
                    accent="blue"
                    change={metrics ? `${metrics.conversionRate}% conversion rate` : undefined}
                />
                <StatCard
                    title="In Conversation"
                    value={metrics?.contacted ?? 0}
                    icon={<LuTarget />}
                    accent="amber"
                    suffix=" active"
                />
                <StatCard
                    title="In Trial"
                    value={metrics?.trial ?? 0}
                    icon={<LuClock />}
                    accent="terracotta"
                    suffix=" yogis"
                />
                <StatCard
                    title="Follow-ups Overdue"
                    value={metrics?.overdue ?? 0}
                    icon={<LuCalendar />}
                    accent="amber"
                    changeType="negative"
                    change={metrics && metrics.overdue > 0 ? "Requires action today" : "Up to date"}
                />
            </div>

            {/* Comprehensive Toolbar & Filters */}
            <div className="bg-surface p-3.5 rounded-2xl border border-hairline mb-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* View Switcher & Search */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex rounded-control border border-hairline bg-surface-raised p-0.5">
                            <button
                                onClick={() => setViewMode("kanban")}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-control transition-colors ${
                                    viewMode === "kanban"
                                        ? "bg-surface text-ink shadow-sm font-semibold"
                                        : "text-ink-subtle hover:text-ink"
                                }`}
                            >
                                <LuKanban className="w-3.5 h-3.5" /> Pipeline Board
                            </button>
                            <button
                                onClick={() => setViewMode("table")}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-control transition-colors ${
                                    viewMode === "table"
                                        ? "bg-surface text-ink shadow-sm font-semibold"
                                        : "text-ink-subtle hover:text-ink"
                                }`}
                            >
                                <LuTable className="w-3.5 h-3.5" /> Data Table
                            </button>
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by name, email, phone..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="text-xs rounded-control border border-hairline bg-surface-raised px-2.5 py-1.5 pl-8 text-ink placeholder:text-ink-subtle focus:outline-none focus:border-brand w-48 sm:w-60"
                            />
                            <LuSearch className="w-3.5 h-3.5 absolute left-2.5 top-2 text-ink-subtle" />
                        </div>
                    </div>

                    {/* Actions: Add Lead, Import, Export */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsImportOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control border border-hairline bg-surface hover:bg-surface-raised text-xs font-medium text-ink transition-colors"
                        >
                            <LuUpload className="w-3.5 h-3.5 text-blue-600" /> Import
                        </button>
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control border border-hairline bg-surface hover:bg-surface-raised text-xs font-medium text-ink transition-colors"
                        >
                            <LuDownload className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
                        </button>
                        <Button variant="primary" size="sm" icon={LuPlus} onClick={handleCreate}>
                            Add New Lead
                        </Button>
                    </div>
                </div>

                {/* Filter Dropdowns */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-hairline/60 text-xs">
                    <span className="text-ink-subtle flex items-center gap-1 font-semibold text-[11px] uppercase tracking-wider">
                        <LuFilter className="w-3 h-3" /> Filter:
                    </span>

                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="rounded-control border border-hairline bg-surface px-2 py-1 text-ink text-xs focus:outline-none focus:border-brand"
                    >
                        <option value="">All Stages</option>
                        <option value="NEW">New</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="TRIAL">Trial</option>
                        <option value="CONVERTED">Converted</option>
                        <option value="LOST">Lost</option>
                    </select>

                    {/* Source filter */}
                    <select
                        value={sourceFilter}
                        onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
                        className="rounded-control border border-hairline bg-surface px-2 py-1 text-ink text-xs focus:outline-none focus:border-brand"
                    >
                        <option value="">All Sources</option>
                        <option value="WEBSITE">Website</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="SOCIAL_MEDIA">Social Media / Meta</option>
                        <option value="REFERRAL">Referral</option>
                        <option value="OTHER">Other</option>
                    </select>

                    {/* Program filter */}
                    <select
                        value={programFilter}
                        onChange={(e) => { setProgramFilter(e.target.value); setPage(1); }}
                        className="rounded-control border border-hairline bg-surface px-2 py-1 text-ink text-xs focus:outline-none focus:border-brand"
                    >
                        <option value="">All Programs</option>
                        <option value="EVERYDAY_YOGA">Everyday Yoga</option>
                        <option value="YOGA_THERAPY">Yoga Therapy</option>
                    </select>

                    {/* Assigned Counselor */}
                    <select
                        value={staffFilter}
                        onChange={(e) => { setStaffFilter(e.target.value); setPage(1); }}
                        className="rounded-control border border-hairline bg-surface px-2 py-1 text-ink text-xs focus:outline-none focus:border-brand"
                    >
                        <option value="">All Counselors</option>
                        <option value="unassigned">Unassigned</option>
                        {staffList.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>

                    {(statusFilter || sourceFilter || programFilter || staffFilter || search) && (
                        <button
                            type="button"
                            onClick={() => {
                                setStatusFilter("");
                                setSourceFilter("");
                                setProgramFilter("");
                                setStaffFilter("");
                                setSearch("");
                                setPage(1);
                            }}
                            className="text-[11px] text-brand hover:underline font-medium ml-auto"
                        >
                            Reset filters
                        </button>
                    )}
                </div>
            </div>

            {/* Bulk Selection Bar in Table View */}
            {viewMode === "table" && selectedLeadIds.length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-brand/5 border border-brand/20 flex flex-wrap items-center justify-between gap-3 animate-fade-in text-xs">
                    <div className="flex items-center gap-2">
                        <LuCircleCheck className="w-4 h-4 text-brand" />
                        <span className="font-semibold text-ink">
                            {selectedLeadIds.length} lead{selectedLeadIds.length === 1 ? '' : 's'} selected
                        </span>
                        <button
                            type="button"
                            onClick={toggleSelectAll}
                            className="text-xs text-brand hover:underline font-medium ml-2"
                        >
                            {selectedLeadIds.length === leads.length ? "Deselect All" : "Select All"}
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Bulk Move Stage */}
                        <div className="flex items-center gap-1">
                            <span className="text-ink-subtle">Move:</span>
                            <select
                                disabled={bulkSubmitting}
                                onChange={(e) => {
                                    if (e.target.value) handleBulkStage(e.target.value);
                                    e.target.value = "";
                                }}
                                className="rounded-control border border-hairline bg-surface px-2 py-1 text-xs text-ink"
                            >
                                <option value="">Select Stage...</option>
                                <option value="CONTACTED">Contacted</option>
                                <option value="TRIAL">Trial</option>
                                <option value="CONVERTED">Converted</option>
                                <option value="LOST">Lost</option>
                            </select>
                        </div>

                        {/* Bulk Assign */}
                        <div className="flex items-center gap-1">
                            <span className="text-ink-subtle">Assign:</span>
                            <select
                                disabled={bulkSubmitting}
                                onChange={(e) => {
                                    if (e.target.value) handleBulkAssign(e.target.value);
                                    e.target.value = "";
                                }}
                                className="rounded-control border border-hairline bg-surface px-2 py-1 text-xs text-ink"
                            >
                                <option value="">Select Staff...</option>
                                <option value="">Unassign</option>
                                {staffList.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Bulk Delete */}
                        <button
                            type="button"
                            disabled={bulkSubmitting}
                            onClick={handleBulkDelete}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-control bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-medium transition-colors"
                        >
                            <LuTrash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                    </div>
                </div>
            )}

            {/* Main View: Kanban or Table */}
            {viewMode === "kanban" ? (
                <KanbanBoard<Lead, Lead['status']>
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
                        const due = lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : null;
                        const isOverdue = due && due.getTime() <= Date.now() && lead.status !== 'CONVERTED' && lead.status !== 'LOST';

                        return (
                            <div className="bg-surface rounded-xl p-3.5 border border-hairline shadow-sm hover:shadow-md hover:border-brand/40 transition-all flex flex-col gap-2.5">
                                <div className="flex items-start justify-between gap-2">
                                    <Link
                                        href={`/admin/leads/${lead.id}`}
                                        className="font-semibold text-sm text-ink hover:text-brand transition-colors line-clamp-1"
                                    >
                                        {lead.name}
                                    </Link>
                                    <div className="flex items-center gap-1.5">
                                        {/* Quick Log Touch Button */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setQuickLogLead(lead);
                                                setIsQuickLogOpen(true);
                                            }}
                                            title="Quick Log Touch (Call, Note, Outcome)"
                                            className="p-1 rounded text-brand hover:bg-brand/10 transition-colors"
                                        >
                                            <LuPhoneCall className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(lead)}
                                            className="text-[11px] font-medium text-ink-subtle hover:text-ink transition-colors"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>

                                <div className="text-xs text-ink-subtle space-y-0.5">
                                    <div className="truncate">{lead.email}</div>
                                    {lead.phone && (
                                        <div className="flex items-center justify-between pt-0.5">
                                            <span>{lead.phone}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setWhatsAppLead(lead);
                                                    setIsWhatsAppOpen(true);
                                                }}
                                                title="Open WhatsApp Templates"
                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded transition-colors"
                                            >
                                                <LuMessageCircle className="w-3 h-3" /> WhatsApp
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-1 pt-1">
                                    {lead.programInterest && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-raised border border-hairline text-ink-subtle truncate max-w-[140px]">
                                            {lead.programInterest.replace(/_/g, ' ')}
                                        </span>
                                    )}
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                                        {lead.source.replace('_', ' ').toLowerCase()}
                                    </span>
                                </div>

                                {/* Follow-up & Owner Bar */}
                                <div className="pt-2 border-t border-hairline/60 flex items-center justify-between text-[11px]">
                                    <span className="text-ink-subtle truncate max-w-[100px]" title={lead.assignedTo?.name || "Unassigned"}>
                                        {lead.assignedTo ? lead.assignedTo.name : "Unassigned"}
                                    </span>

                                    {due ? (
                                        <div className="flex items-center gap-1">
                                            <span className={`font-medium ${isOverdue ? "text-red-600 font-semibold" : "text-ink-subtle"}`}>
                                                {isOverdue ? "⚠ Due " : "Due "}{due.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                            </span>
                                            {isOverdue && (
                                                <div className="flex gap-0.5 text-[9px]">
                                                    <button
                                                        type="button"
                                                        title="Snooze 1 Day"
                                                        onClick={() => handleSnoozeFollowUp(lead.id, 1)}
                                                        className="px-1 py-0.2 rounded bg-surface-raised border border-hairline text-ink-subtle hover:text-ink font-semibold"
                                                    >
                                                        +1d
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Snooze 3 Days"
                                                        onClick={() => handleSnoozeFollowUp(lead.id, 3)}
                                                        className="px-1 py-0.2 rounded bg-surface-raised border border-hairline text-ink-subtle hover:text-ink font-semibold"
                                                    >
                                                        +3d
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleSnoozeFollowUp(lead.id, 2)}
                                            className="text-brand text-[10px] hover:underline"
                                        >
                                            + Set follow-up
                                        </button>
                                    )}
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
                    title="All Leads"
                    onCreate={handleCreate}
                    server={{
                        page,
                        pageSize: PAGE_SIZE,
                        totalCount,
                        onPageChange: setPage,
                        onSearchChange: (q) => { setSearch(q); setPage(1); },
                    }}
                    actions={(lead) => (
                        <TableActions>
                            <button
                                type="button"
                                onClick={() => {
                                    setQuickLogLead(lead);
                                    setIsQuickLogOpen(true);
                                }}
                                className="text-xs font-semibold text-brand hover:underline"
                            >
                                Quick Touch
                            </button>
                            <Link href={`/admin/leads/${lead.id}`} className="text-xs font-semibold text-ink hover:underline">
                                View
                            </Link>
                            <ActionButton onClick={() => handleEdit(lead)}>Update</ActionButton>
                            <ActionButton tone="danger" onClick={() => handleDelete(lead)}>Delete</ActionButton>
                        </TableActions>
                    )}
                />
            )}

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                            <h2 className="font-serif text-xl text-gray-800">{isEditMode ? 'Update Lead' : 'Add New Lead'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 -mr-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Name</label>
                                    <input type="text" required value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Email</label>
                                    <input type="email" required value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})} className={inputClass} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Phone</label>
                                    <input type="text" value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Country</label>
                                    <input type="text" value={formData.country}
                                        onChange={(e) => setFormData({...formData, country: e.target.value})} className={inputClass} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Lead Source</label>
                                    <select value={formData.source} onChange={(e) => setFormData({...formData, source: e.target.value})}
                                        className={inputClass} disabled={isEditMode}>
                                        <option value="WEBSITE">Website</option>
                                        <option value="WHATSAPP">WhatsApp</option>
                                        <option value="REFERRAL">Referral</option>
                                        <option value="SOCIAL_MEDIA">Social Media</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Status</label>
                                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className={inputClass}>
                                        <option value="NEW">New</option>
                                        <option value="CONTACTED">Contacted</option>
                                        <option value="TRIAL">Trial Scheduled/Attended</option>
                                        <option value="CONVERTED">Converted</option>
                                        <option value="LOST">Lost</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Program Interest</label>
                                    <select value={formData.programInterest} onChange={(e) => setFormData({...formData, programInterest: e.target.value})} className={inputClass}>
                                        <option value="">Not specified</option>
                                        <option value="EVERYDAY_YOGA">Everyday Yoga</option>
                                        <option value="YOGA_THERAPY">Yoga Therapy</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Campaign</label>
                                    <input type="text" value={formData.campaign} placeholder="e.g. instagram_diwali_2026"
                                        onChange={(e) => setFormData({...formData, campaign: e.target.value})} className={inputClass} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Assign To (Staff)</label>
                                    <select value={formData.assignedToId} onChange={(e) => setFormData({...formData, assignedToId: e.target.value})} className={inputClass}>
                                        <option value="">Unassigned</option>
                                        {staffList.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Next Follow-up</label>
                                    <input type="date" value={formData.nextFollowUpAt}
                                        onChange={(e) => setFormData({...formData, nextFollowUpAt: e.target.value})} className={inputClass} />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Notes</label>
                                <textarea rows={3} value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})} className={inputClass}
                                    placeholder="Add any specific context here..." />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting}
                                    className="px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                                    {isSubmitting ? 'Saving…' : (isEditMode ? 'Update Lead' : 'Add Lead')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export function AdminLeadsContent({ embedded = false }: { embedded?: boolean } = {}) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LeadsDashboard embedded={embedded} />
        </Suspense>
    );
}

export default function AdminLeadsPage() {
    return <AdminLeadsContent />;
}
