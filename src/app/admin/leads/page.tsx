"use client";

import { useEffect, useState, Suspense } from "react";
import DTable from "@/components/admin/DTable";
import { formatDistanceToNow } from "date-fns";

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
            fetchLeads();
        } catch (err) {
            alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
                fetchLeads();
            } catch (err) {
                alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'NEW': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'CONTACTED': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'TRIAL': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'CONVERTED': return 'bg-green-100 text-green-800 border-green-200';
            case 'LOST': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const columns = [
        {
            header: "Contact Info",
            accessor: (lead: Lead) => (
                <div>
                    <div className="font-bold text-gray-900">{lead.name}</div>
                    <div className="text-xs text-gray-500">{lead.email}</div>
                    {lead.phone && <div className="text-xs text-gray-500">{lead.phone}</div>}
                </div>
            )
        },
        {
            header: "Source",
            accessor: (lead: Lead) => (
                <span className="capitalize text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {lead.source.replace('_', ' ')}
                </span>
            )
        },
        {
            header: "Status",
            accessor: (lead: Lead) => (
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border ${getStatusStyle(lead.status)}`}>
                    {lead.status}
                </span>
            ),
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

    if (loading) {
        return (
            <div>
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="font-serif text-3xl text-gray-800 mb-2">Leads CRM</h1>
                        <p className="text-gray-500">Track and manage potential members from inquiry to conversion.</p>
                    </div>
                </div>
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="font-serif text-3xl text-gray-800 mb-2">Leads CRM</h1>
                    <p className="text-gray-500">Track and manage potential members from inquiry to conversion.</p>
                </div>
            </div>

            <DTable
                data={leads}
                columns={columns}
                title="All Leads"
                onCreate={handleCreate}
                actions={(lead) => (
                    <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(lead)} className="text-primary hover:text-secondary text-xs font-bold uppercase tracking-wider">Update</button>
                        <button onClick={() => handleDelete(lead)} className="text-red-400 hover:text-red-600 text-xs font-bold uppercase tracking-wider">Delete</button>
                    </div>
                )}
            />

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-serif text-2xl text-primary">{isEditMode ? 'Update Lead' : 'Add New Lead'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Email</label>
                                    <input 
                                        type="email" 
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Phone</label>
                                    <input 
                                        type="text" 
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Country</label>
                                    <input 
                                        type="text" 
                                        value={formData.country}
                                        onChange={(e) => setFormData({...formData, country: e.target.value})}
                                        className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none" 
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Lead Source</label>
                                    <select 
                                        value={formData.source}
                                        onChange={(e) => setFormData({...formData, source: e.target.value})}
                                        className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none bg-white"
                                        disabled={isEditMode}
                                    >
                                        <option value="WEBSITE">Website</option>
                                        <option value="WHATSAPP">WhatsApp</option>
                                        <option value="REFERRAL">Referral</option>
                                        <option value="SOCIAL_MEDIA">Social Media</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Status</label>
                                    <select 
                                        value={formData.status}
                                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                                        className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none bg-white"
                                    >
                                        <option value="NEW">New</option>
                                        <option value="CONTACTED">Contacted</option>
                                        <option value="TRIAL">Trial Scheduled/Attended</option>
                                        <option value="CONVERTED">Converted</option>
                                        <option value="LOST">Lost</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Assign To (Staff)</label>
                                <select 
                                    value={formData.assignedToId}
                                    onChange={(e) => setFormData({...formData, assignedToId: e.target.value})}
                                    className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none bg-white"
                                >
                                    <option value="">Unassigned</option>
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Notes</label>
                                <textarea 
                                    rows={3}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none" 
                                    placeholder="Add any specific context here..."
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2 border border-gray-200 text-gray-600 font-bold uppercase tracking-widest rounded hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="flex-1 py-2 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Lead' : 'Add Lead')}
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
