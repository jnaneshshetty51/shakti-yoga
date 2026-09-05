"use client";

import { useState, useEffect, Suspense } from "react";
import { PageHeader, Tabs, Badge } from "@/components/admin";
import DTable from "@/components/admin/DTable";

export type Story = {
    id: string;
    userId: string;
    user: { id: string; name: string } | null;
    title: string;
    content: string;
    status: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
    createdAt: string;
};

const tabs = [
  { label: "All Stories", value: "all" },
  { label: "Published", value: "PUBLISHED" },
  { label: "Pending", value: "PENDING" },
  { label: "Drafts", value: "DRAFT" },
];

function StoriesDashboard() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
      title: '',
      content: '',
      status: 'PUBLISHED',
      userId: ''
  });
  
  const [usersList, setUsersList] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    fetchStories();
    fetchUsersList();
  }, []);

  const fetchStories = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/stories");
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      }
    } catch (error) {
      console.error("Failed to fetch stories:", error);
    } finally {
      setLoading(false);
    }
  };
  
  async function fetchUsersList() {
      try {
          const response = await fetch('/api/admin/users');
          if (response.ok) {
              const data = await response.json();
              setUsersList(data.users || []);
          }
      } catch (error) {
          console.error('Failed to fetch users list:', error);
      }
  }

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      const url = isEditMode ? `/api/admin/stories/${editingStoryId}` : '/api/admin/stories';
      const method = isEditMode ? 'PUT' : 'POST';
      
      try {
          const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
          });
          const data = await res.json();
          
          if (!res.ok) {
              throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} story`);
          }
          
          setIsModalOpen(false);
          setEditingStoryId(null);
          fetchStories();
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
          content: '',
          status: 'PUBLISHED',
          userId: ''
      });
      setIsModalOpen(true);
  };

  const handleEdit = (story: Story) => {
      setFormData({
          title: story.title,
          content: story.content,
          status: story.status,
          userId: story.userId || ''
      });
      setEditingStoryId(story.id);
      setIsEditMode(true);
      setIsModalOpen(true);
  };

  const handleDelete = async (story: Story) => {
      if (confirm(`Are you sure you want to delete the story: "${story.title}"?`)) {
          try {
              const res = await fetch(`/api/admin/stories/${story.id}`, { method: 'DELETE' });
              if (!res.ok) throw new Error('Failed to delete story');
              fetchStories();
          } catch (err) {
              alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
          }
      }
  };

  const filteredStories = stories.filter((story) => {
    if (activeTab !== "all" && story.status !== activeTab) return false;
    return true;
  });

  const getStatusBadge = (status: Story["status"]) => {
    switch (status) {
      case "PUBLISHED":
        return <Badge variant="success">Published</Badge>;
      case "PENDING":
        return <Badge variant="warning">Pending</Badge>;
      case "DRAFT":
        return <Badge variant="default">Draft</Badge>;
      case "REJECTED":
        return <Badge variant="error">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const columns = [
    {
      header: "Story",
      accessor: (story: Story) => (
        <div>
          <div className="font-medium text-gray-900 line-clamp-1">{story.title}</div>
          <div className="text-sm text-gray-500 line-clamp-2 mt-1">{story.content}</div>
        </div>
      ),
    },
    {
      header: "Author",
      accessor: (story: Story) => (
        <div className="text-sm">{story.user?.name || "Anonymous"}</div>
      ),
      sortable: true
    },
    {
      header: "Status",
      accessor: (story: Story) => getStatusBadge(story.status),
      sortable: true
    },
    {
      header: "Submitted",
      accessor: (story: Story) => (
        <span className="text-sm text-gray-500">
          {new Date(story.createdAt).toLocaleDateString()}
        </span>
      ),
      sortable: true
    }
  ];

  if (loading) {
      return (
          <div>
              <div className="mb-8 flex justify-between items-end">
                  <div>
                      <h1 className="font-serif text-3xl text-gray-800 mb-2">Member Stories</h1>
                      <p className="text-gray-500">View and manage yoga journey stories from your community members.</p>
                  </div>
              </div>
              <div className="text-gray-500">Loading...</div>
          </div>
      );
  }

  return (
    <div>
      <PageHeader
        title="Member Stories"
        subtitle="View and manage yoga journey stories from your community members"
      />

      <div className="mb-6">
        <Tabs
          tabs={tabs.map((t) => ({
            ...t,
            count: t.value === "all" ? stories.length : stories.filter((s) => s.status === t.value).length,
          }))}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <DTable
        columns={columns}
        data={filteredStories}
        title="Member Stories"
        onCreate={handleCreate}
        actions={(story) => (
            <div className="flex justify-end gap-2">
                <button onClick={() => handleEdit(story)} className="text-primary hover:text-secondary text-xs font-bold uppercase tracking-wider">Edit</button>
                <button onClick={() => handleDelete(story)} className="text-red-400 hover:text-red-600 text-xs font-bold uppercase tracking-wider">Delete</button>
            </div>
        )}
      />

      {/* Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="font-serif text-2xl text-primary">{isEditMode ? 'Update Story' : 'Add New Story'}</h2>
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

                      {!isEditMode && (
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Author (Optional)</label>
                            <select 
                                value={formData.userId}
                                onChange={(e) => setFormData({...formData, userId: e.target.value})}
                                className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none bg-white"
                            >
                                <option value="">Anonymous / System</option>
                                {usersList.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                      )}

                      <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Status</label>
                          <select 
                              value={formData.status}
                              onChange={(e) => setFormData({...formData, status: e.target.value})}
                              className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none bg-white"
                          >
                              <option value="PUBLISHED">Published</option>
                              <option value="PENDING">Pending Approval</option>
                              <option value="DRAFT">Draft</option>
                              <option value="REJECTED">Rejected</option>
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Content</label>
                          <textarea 
                              rows={5}
                              required
                              value={formData.content}
                              onChange={(e) => setFormData({...formData, content: e.target.value})}
                              className="w-full p-2 border border-gray-200 rounded focus:border-primary focus:outline-none" 
                              placeholder="Share the journey..."
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
                              {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Story' : 'Create Story')}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

export default function AdminStoriesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <StoriesDashboard />
        </Suspense>
    );
}