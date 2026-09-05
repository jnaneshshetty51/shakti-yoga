"use client";

import { useEffect, useState, Suspense } from "react";
import { PageHeader, Tabs, EmptyState, StatusBadge } from "@/components/admin";
import { FaPlus, FaSearch, FaPlay, FaEdit, FaTrash, FaUsers, FaTag } from "react-icons/fa";
import { useCurrency } from '@/context/CurrencyContext';

interface Program {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  enrolledCount: number;
  price: number;
  thumbnail: string | null;
}

const tabs = [
  { label: "All Programs", value: "all" },
  { label: "Active", value: "ACTIVE" },
  { label: "Drafts", value: "DRAFT" },
  { label: "Archived", value: "ARCHIVED" },
];

function ProgramsDashboard() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { formatPrice } = useCurrency();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
      title: '',
      description: '',
      duration: '4 Weeks',
      level: 'ALL_LEVELS',
      status: 'DRAFT',
      price: 0,
      thumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80'
  });

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/programs');
      if (response.ok) {
        const data = await response.json();
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error('Failed to fetch programs:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      const url = isEditMode ? `/api/admin/programs/${editingId}` : '/api/admin/programs';
      const method = isEditMode ? 'PUT' : 'POST';
      
      try {
          const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
          });
          const data = await res.json();
          
          if (!res.ok) {
              throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} program`);
          }
          
          setIsModalOpen(false);
          setEditingId(null);
          fetchPrograms();
      } catch (err) {
          alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleCreate = () => {
      setIsEditMode(false);
      setFormData({
          title: '',
          description: '',
          duration: '4 Weeks',
          level: 'ALL_LEVELS',
          status: 'DRAFT',
          price: 0,
          thumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80'
      });
      setIsModalOpen(true);
  };

  const handleEdit = (prog: Program) => {
      setFormData({
          title: prog.title,
          description: prog.description,
          duration: prog.duration,
          level: prog.level,
          status: prog.status,
          price: prog.price,
          thumbnail: prog.thumbnail || ''
      });
      setEditingId(prog.id);
      setIsEditMode(true);
      setIsModalOpen(true);
  };

  const handleDelete = async (prog: Program) => {
      if (confirm(`Are you sure you want to delete program: ${prog.title}?`)) {
          try {
              const res = await fetch(`/api/admin/programs/${prog.id}`, { method: 'DELETE' });
              if (!res.ok) throw new Error('Failed to delete program');
              fetchPrograms();
          } catch (err) {
              alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
          }
      }
  };

  const filteredPrograms = programs.filter(program => {
    if (activeTab !== "all" && program.status !== activeTab) return false;
    if (searchQuery) {
      return program.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
             program.description.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const getLevelColor = (level: string) => {
    switch(level) {
      case 'BEGINNER': return 'bg-green-100 text-green-700 border-green-200';
      case 'INTERMEDIATE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ADVANCED': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatLevel = (level: string) => {
      return level.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  return (
    <div>
      <PageHeader
        title="Programs Library"
        subtitle="Design and manage your premium yoga courses, challenges, and guided paths."
        actions={
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
            <FaPlus />
            Create Program
          </button>
        }
      />

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <Tabs
          tabs={tabs.map((t) => ({
            ...t,
            count: t.value === "all" ? programs.length : programs.filter((p) => p.status === t.value).length,
          }))}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search programs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm w-full lg:w-80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50 hover:bg-white focus:bg-white"
          />
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[380px]">
              <div className="h-48 bg-gray-200" />
              <div className="p-5 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-12">
          <EmptyState
            icon="🧘‍♀️"
            title="No programs found"
            description={
              activeTab === "all"
                ? "Start building your first premium yoga program today."
                : `No programs found in ${activeTab.toLowerCase()} status.`
            }
            action={{
              label: "Create First Program",
              onClick: handleCreate,
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredPrograms.map((program) => (
            <div 
              key={program.id} 
              className="group bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl hover:border-primary/20 transition-all duration-500 flex flex-col"
            >
              {/* Image Header */}
              <div className="relative h-56 overflow-hidden bg-gray-100">
                <img 
                  src={program.thumbnail || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80'} 
                  alt={program.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                
                {/* Badges Overlay */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border ${getLevelColor(program.level)}`}>
                    {formatLevel(program.level)}
                  </span>
                  <span className="px-3 py-1 bg-black/40 backdrop-blur-md border border-white/20 rounded-full text-xs font-bold uppercase tracking-wider text-white w-max">
                    {program.duration}
                  </span>
                </div>
                
                <div className="absolute top-4 right-4">
                  <StatusBadge status={program.status === 'ACTIVE' ? 'PUBLISHED' : program.status === 'DRAFT' ? 'DRAFT' : 'ARCHIVED'} />
                </div>

                {/* Play Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button className="w-16 h-16 bg-white/20 backdrop-blur-md border border-white/40 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-primary transition-all duration-300 transform scale-75 group-hover:scale-100">
                    <FaPlay className="text-xl ml-1" />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors line-clamp-1">{program.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-1 leading-relaxed">{program.description}</p>
                
                {/* Metrics */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <FaUsers className="text-sm" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Enrolled</div>
                      <div className="text-sm font-bold text-gray-900">{program.enrolledCount.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <FaTag className="text-sm" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Price</div>
                      <div className="text-sm font-bold text-gray-900">{formatPrice(program.price)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Manage</span>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(program)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary transition-colors shadow-sm">
                    <FaEdit className="text-sm" />
                  </button>
                  <button onClick={() => handleDelete(program)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm">
                    <FaTrash className="text-sm" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="font-serif text-2xl text-primary">{isEditMode ? 'Edit Program' : 'Create Program'}</h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Title</label>
                          <input 
                              type="text" 
                              required
                              value={formData.title}
                              onChange={(e) => setFormData({...formData, title: e.target.value})}
                              className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none" 
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Duration</label>
                            <input 
                                type="text" 
                                required
                                placeholder="e.g. 4 Weeks"
                                value={formData.duration}
                                onChange={(e) => setFormData({...formData, duration: e.target.value})}
                                className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Price (INR)</label>
                            <input 
                                type="number" 
                                required
                                value={formData.price}
                                onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                                className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none" 
                            />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Level</label>
                            <select 
                                value={formData.level}
                                onChange={(e) => setFormData({...formData, level: e.target.value})}
                                className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none bg-white"
                            >
                                <option value="BEGINNER">Beginner</option>
                                <option value="INTERMEDIATE">Intermediate</option>
                                <option value="ADVANCED">Advanced</option>
                                <option value="ALL_LEVELS">All Levels</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Status</label>
                            <select 
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value})}
                                className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none bg-white"
                            >
                                <option value="ACTIVE">Active (Published)</option>
                                <option value="DRAFT">Draft</option>
                                <option value="ARCHIVED">Archived</option>
                            </select>
                        </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Thumbnail URL</label>
                          <input 
                              type="text" 
                              value={formData.thumbnail}
                              onChange={(e) => setFormData({...formData, thumbnail: e.target.value})}
                              className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none" 
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Description</label>
                          <textarea 
                              rows={4}
                              required
                              value={formData.description}
                              onChange={(e) => setFormData({...formData, description: e.target.value})}
                              className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none" 
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
                              {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Program' : 'Create Program')}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

export default function AdminProgramsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProgramsDashboard />
        </Suspense>
    );
}
