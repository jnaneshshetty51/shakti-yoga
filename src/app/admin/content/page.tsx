"use client";

import { useState, useEffect } from "react";
import DTable from "@/components/admin/DTable";

type Story = {
    id: string;
    name: string;
    location: string;
    plan: string;
    rating: number;
    quote: string;
};

type BlogPost = {
    id: string;
    title: string;
    category: string;
    date: string;
    slug: string;
};

type WhatsAppGroup = {
    id: string;
    name: string;
    role: string;
    whatsappLink: string;
};

export default function AdminContentPage() {
    const [activeTab, setActiveTab] = useState<'stories' | 'blog' | 'whatsapp'>('stories');
    const [stories, setStories] = useState<Story[]>([]);
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
    const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchContent() {
            try {
                const response = await fetch('/api/admin/content');
                if (response.ok) {
                    const data = await response.json();
                    setStories(data.stories || []);
                    setBlogPosts(data.blogPosts || []);
                    setGroups(data.groups || []);
                }
            } catch (error) {
                console.error('Failed to fetch content:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchContent();
    }, []);

    if (loading) {
        return (
            <div>
                <div className="mb-8">
                    <h1 className="font-serif text-3xl text-gray-800 mb-2">Content Management</h1>
                    <p className="text-gray-500">Manage website content, stories, blog posts, and community links.</p>
                </div>
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="font-serif text-3xl text-gray-800 mb-2">Content Management</h1>
                <p className="text-gray-500">Manage website content, stories, blog posts, and community links.</p>
            </div>

            <div className="flex gap-4 mb-8 border-b border-gray-200">
                {['stories', 'blog', 'whatsapp'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'stories' && (
                <DTable
                    data={stories}
                    columns={[
                        { header: "Name", accessor: "name", className: "font-bold" },
                        { header: "Location", accessor: "location" },
                        { header: "Plan", accessor: "plan" },
                        { header: "Rating", accessor: (s: Story) => "★".repeat(s.rating) },
                    ]}
                    title="Stories & Testimonials"
                    onCreate={() => alert("Add Story")}
                    actions={() => <button className="text-primary text-xs font-bold uppercase">Edit</button>}
                />
            )}

            {activeTab === 'blog' && (
                <DTable
                    data={blogPosts}
                    columns={[
                        { header: "Title", accessor: "title", className: "font-bold" },
                        { header: "Category", accessor: "category" },
                        { header: "Date", accessor: "date" },
                    ]}
                    title="Blog Posts"
                    onCreate={() => alert("Write Post")}
                    actions={() => <button className="text-primary text-xs font-bold uppercase">Edit</button>}
                />
            )}

            {activeTab === 'whatsapp' && (
                <DTable
                    data={groups}
                    columns={[
                        { header: "Group Name", accessor: "name", className: "font-bold" },
                        { header: "Role", accessor: "role" },
                        { header: "Link", accessor: (g: WhatsAppGroup) => <a href={g.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline truncate block w-32">{g.whatsappLink}</a> },
                    ]}
                    title="WhatsApp Groups"
                    actions={() => <button className="text-primary text-xs font-bold uppercase">Edit</button>}
                />
            )}
        </div>
    );
}
