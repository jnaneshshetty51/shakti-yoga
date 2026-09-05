"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin";
import { FaPlus, FaVideo, FaUsers, FaClock } from "react-icons/fa";

interface LiveClass {
    id: string;
    title: string;
    description: string | null;
    scheduledAt: string;
    status: string;
    roomUrl: string | null;
    teacher: {
        id: string;
        name: string;
    };
    _count: {
        participants: number;
    };
}

export default function AdminLiveClassesPage() {
    const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        scheduledAt: '',
        teacherId: ''
    });
    const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        fetchLiveClasses();
        fetchTeachers();
    }, []);

    const fetchLiveClasses = async () => {
        try {
            const response = await fetch('/api/live-classes');
            if (response.ok) {
                const data = await response.json();
                setLiveClasses(data.liveClasses || []);
            }
        } catch (error) {
            console.error('Failed to fetch live classes:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeachers = async () => {
        try {
            const response = await fetch('/api/admin/users');
            if (response.ok) {
                const data = await response.json();
                const teacherList = (data.users || []).filter((u: { role: string }) => u.role === 'TEACHER');
                setTeachers(teacherList);
                if (teacherList.length > 0) {
                    setFormData(prev => ({ ...prev, teacherId: teacherList[0].id }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch teachers:', error);
        }
    };

    const handleCreateLiveClass = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);

        try {
            const response = await fetch('/api/live-classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setShowCreateModal(false);
                setFormData({ title: '', description: '', scheduledAt: '', teacherId: teachers[0]?.id || '' });
                fetchLiveClasses();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to create live class');
            }
        } catch (error) {
            console.error('Failed to create live class:', error);
            alert('Failed to create live class');
        } finally {
            setCreating(false);
        }
    };

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'LIVE': return 'bg-red-500 text-white';
            case 'SCHEDULED': return 'bg-blue-500 text-white';
            case 'ENDED': return 'bg-gray-500 text-white';
            default: return 'bg-gray-200 text-gray-800';
        }
    };

    return (
        <div>
            <PageHeader
                title="Live Classes"
                subtitle="Manage live yoga sessions with real-time video"
                actions={
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <FaPlus />
                        Schedule Live Class
                    </button>
                }
            />

            {loading ? (
                <div className="text-center py-20 text-gray-500">Loading...</div>
            ) : liveClasses.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <FaVideo className="text-6xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No Live Classes Scheduled</h3>
                    <p className="text-gray-500 mb-6">Create your first live yoga class to get started</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-primary/90 transition-colors"
                    >
                        Schedule Live Class
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {liveClasses.map((liveClass) => (
                        <div key={liveClass.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(liveClass.status)}`}>
                                        {liveClass.status}
                                    </span>
                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                        <FaUsers className="text-xs" />
                                        {liveClass._count.participants}
                                    </div>
                                </div>

                                <h3 className="font-serif text-xl text-gray-800 mb-2">{liveClass.title}</h3>
                                {liveClass.description && (
                                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{liveClass.description}</p>
                                )}

                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                                    <FaClock className="text-xs" />
                                    {formatDateTime(liveClass.scheduledAt)}
                                </div>

                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                        <span className="text-xs font-bold text-primary">
                                            {liveClass.teacher.name.charAt(0)}
                                        </span>
                                    </div>
                                    <span>{liveClass.teacher.name}</span>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                                {liveClass.roomUrl && (
                                    <a
                                        href={liveClass.roomUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 text-center py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-primary/90 transition-colors"
                                    >
                                        Open Room
                                    </a>
                                )}
                                <button className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-bold uppercase tracking-widest rounded hover:bg-gray-100 transition-colors">
                                    Edit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h2 className="font-serif text-2xl text-gray-800">Schedule Live Class</h2>
                            <p className="text-sm text-gray-500">Create a new live yoga session</p>
                        </div>

                        <form onSubmit={handleCreateLiveClass} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder="Morning Vinyasa Flow"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                    placeholder="A energizing morning class suitable for all levels..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Time *</label>
                                <input
                                    type="datetime-local"
                                    value={formData.scheduledAt}
                                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher *</label>
                                <select
                                    value={formData.teacherId}
                                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                >
                                    {teachers.map(teacher => (
                                        <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-2 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {creating ? 'Creating...' : 'Create Class'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}