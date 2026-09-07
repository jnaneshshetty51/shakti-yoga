"use client";

import { useEffect, useState, Suspense } from "react";
import DTable from "@/components/admin/DTable";
import { useToast } from "@/components/admin/Toast";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, PageLoading, Badge, TableActions, ActionButton, labelClass, inputClass } from "@/components/admin/ui";

export type Lead = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    country: string | null;
    source: 'WEBSITE' | 'WHATSAPP' | 'REFERRAL' | 'SOCIAL_MEDIA' | 'OTHER';
    status: 'NEW' | 'CONTACTED' | 'TRIAL' | 'CONVERTED' | 'LOST';
    notes: string | null;
    trialRequestedAt: string | null;
    trialDate: string | null;
    trialAttended: boolean;
    createdAt: string;
    assignedTo: { id: string, name: string } | null;
    _count: { activities: number };
};

function LeadsDashboard() {
    const { showToast } = useToast();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        country: '',
        status: 'NEW',
        source: 'WEBSITE',
        notes: '',
        assignedToId: ''
    });
    
    const [staffList, setStaffList] = useState<{id: string, name: string}[]>([]);

    useEffect(() => {
        fetchLeads();
        fetchStaffList();
    }, []);

    async function fetchLeads() {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/leads');
            if (response.ok) {
                const data = await response.json();
                setLeads(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch leads:', error);
        } finally {
            setLoading(false);
        }
    }
    
    async function fetchStaffList() {
        try {
            const response = await fetch('/api/admin/users');
            if (response.ok) {
                const data = await response.json();
                const staff = (data.users || []).filter((u: { role: string }) => {
                    const r = String(u.role).toUpperCase();
                    return r === 'SUPER_ADMIN' || r === 'STAFF_ADMIN' || r === 'TEACHER';
                });
                setStaffList(staff);
            }
        } catch (error) {
            console.error('Failed to fetch staff list:', error);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const url = isEditMode ? `/api/admin/leads/${editingLeadId}` : '/api/admin/leads';
        const method = isEditMode ? 'PUT' : 'POST';
        
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} lead`);
            }
            
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
            notes: lead.notes || '',
            assignedToId: lead.assignedTo?.id || ''
        });
        setEditingLeadId(lead.id);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (lead: Lead) => {
        if (confirm(`Are you sure you want to delete lead: ${lead.name}?`)) {
            try {
                const res = await fetch(`/api/admin/leads/${lead.id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Failed to delete lead');
                showToast('success', `Lead "${lead.name}" deleted`);
                fetchLeads();
            } catch (err) {
                showToast('error', err instanceof Error ? err.message : 'Something went wrong');
            }
        }
    };

    const statusTone = (status: string) =>
        ({ NEW: "blue", CONTACTED: "amber", TRIAL: "purple", CONVERTED: "green", LOST: "red" } as const)[status] ?? "gray";

    const columns = [
        {
            header: "Contact Info",
            accessor: (lead: Lead) => (
                <div>
                    <div className="font-bold text-gray-800">{lead.name}</div>
                    <div className="text-xs text-gray-500">{lead.email}</div>
                    {lead.phone && <div className="text-xs text-gray-500">{lead.phone}</div>}
                </div>
            )
        },
        {
            header: "Source",
            accessor: (lead: Lead) => (
                <Badge tone="gray" className="capitalize">{lead.source.replace('_', ' ').toLowerCase()}</Badge>
            )
        },
        {
            header: "Status",
            accessor: (lead: Lead) => <Badge tone={statusTone(lead.status)}>{lead.status}</Badge>,
            sortable: true
        },
        {
            header: "Assigned To",
            accessor: (lead: Lead) => lead.assignedTo ? lead.assignedTo.name : <span className="text-gray-400 italic">Unassigned</span>
        },
        {
            header: "Last Activity",
            accessor: (lead: Lead) => (
                <div>
                    <div className="text-sm">{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</div>
                    <div className="text-xs text-gray-500">{lead._count.activities} interactions</div>
                </div>
            )
        }
    ];

    if (loading) return <PageLoading title="Leads CRM" />;

    return (
        <div>
            <PageHeader title="Leads CRM" subtitle="Track and manage potential members from inquiry to conversion." />

            <DTable
                data={leads}
                columns={columns}
                title="All Leads"
                onCreate={handleCreate}
                actions={(lead) => (
                    <TableActions>
                        <ActionButton onClick={() => handleEdit(lead)}>Update</ActionButton>
                        <ActionButton tone="danger" onClick={() => handleDelete(lead)}>Delete</ActionButton>
                    </TableActions>
                )}
            />

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                            <h2 className="font-serif text-xl text-gray-800">{isEditMode ? 'Update Lead' : 'Add New Lead'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 -mr-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
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

                            <div className="grid grid-cols-2 gap-4">
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

                            <div className="grid grid-cols-2 gap-4">
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

export default function AdminLeadsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LeadsDashboard />
        </Suspense>
    );
}
