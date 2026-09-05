"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues, type FieldDef } from "@/components/admin/EntityFormModal";

type ContentType = "story" | "blog" | "whatsapp";

type Story = {
    id: string; name: string; authorName: string; location: string; plan: string;
    planType: string; rating: number; quote: string; content: string; status: string;
};
type BlogPost = {
    id: string; title: string; category: string; date: string; slug: string;
    excerpt: string; content: string; author: string; status: string;
};
type WhatsAppGroup = {
    id: string; name: string; role: string; whatsappLink: string; pinnedMessage: string;
};

const STATUS_OPTIONS = [
    { label: "Draft", value: "DRAFT" },
    { label: "Published", value: "PUBLISHED" },
    { label: "Archived", value: "ARCHIVED" },
];
const ROLE_OPTIONS = [
    { label: "Everyday Member", value: "MEMBER_EVERYDAY" },
    { label: "Therapy Member", value: "MEMBER_THERAPY" },
    { label: "Trial", value: "TRIAL" },
    { label: "Visitor", value: "VISITOR" },
];

const STORY_FIELDS: FieldDef[] = [
    { name: "authorName", label: "Author Name", required: true },
    { name: "location", label: "Location" },
    { name: "planType", label: "Plan" },
    { name: "rating", label: "Rating (1-5)", type: "number" },
    { name: "quote", label: "Short Quote", type: "textarea", required: true },
    { name: "content", label: "Full Testimonial", type: "textarea" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
];
const BLOG_FIELDS: FieldDef[] = [
    { name: "title", label: "Title", required: true },
    { name: "category", label: "Category", required: true },
    { name: "author", label: "Author" },
    { name: "excerpt", label: "Excerpt", type: "textarea" },
    { name: "content", label: "Content (Markdown)", type: "textarea", required: true },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
];
const GROUP_FIELDS: FieldDef[] = [
    { name: "name", label: "Group Name", required: true },
    { name: "link", label: "WhatsApp Link", required: true },
    { name: "role", label: "For Role", type: "select", required: true, options: ROLE_OPTIONS },
    { name: "pinnedMessage", label: "Pinned Message", type: "textarea" },
];

export default function AdminContentPage() {
    const [activeTab, setActiveTab] = useState<ContentType>("story");
    const [stories, setStories] = useState<Story[]>([]);
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
    const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<{ mode: "create" | "edit"; initial?: EntityValues; id?: string } | null>(null);

    const fetchContent = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    const fields = activeTab === "story" ? STORY_FIELDS : activeTab === "blog" ? BLOG_FIELDS : GROUP_FIELDS;

    const save = async (values: EntityValues) => {
        const res = await fetch(`/api/admin/content?type=${activeTab}`, {
            method: modal?.mode === "edit" ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...values, id: modal?.id }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Save failed");
        }
        setModal(null);
        fetchContent();
    };

    const remove = async (id: string) => {
        if (!confirm("Delete this item?")) return;
        await fetch(`/api/admin/content?type=${activeTab}&id=${id}`, { method: "DELETE" });
        fetchContent();
    };

    const rowActions = (id: string, initial: EntityValues) => (
        <div className="flex justify-end gap-2">
            <button onClick={() => setModal({ mode: "edit", id, initial })} className="text-primary text-xs font-bold uppercase">Edit</button>
            <button onClick={() => remove(id)} className="text-red-400 hover:text-red-600 text-xs font-bold uppercase">Delete</button>
        </div>
    );

    if (loading) {
        return (
            <div>
                <div className="mb-8">
                    <h1 className="font-serif text-3xl text-gray-800 mb-2">Content Management</h1>
                    <p className="text-gray-500">Manage stories, blog posts, and community links.</p>
                </div>
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="font-serif text-3xl text-gray-800 mb-2">Content Management</h1>
                <p className="text-gray-500">Manage stories, blog posts, and community links.</p>
            </div>

            <div className="flex gap-4 mb-8 border-b border-gray-200">
                {(["story", "blog", "whatsapp"] as ContentType[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        {tab === "whatsapp" ? "WhatsApp" : tab}
                    </button>
                ))}
            </div>

            {activeTab === 'story' && (
                <DTable
                    data={stories}
                    columns={[
                        { header: "Author", accessor: "name", className: "font-bold" },
                        { header: "Location", accessor: "location" },
                        { header: "Rating", accessor: (s: Story) => "★".repeat(s.rating) },
                        { header: "Status", accessor: "status" },
                    ]}
                    title="Stories & Testimonials"
                    onCreate={() => setModal({ mode: "create" })}
                    actions={(s: Story) => rowActions(s.id, {
                        authorName: s.authorName, location: s.location, planType: s.planType,
                        rating: s.rating, quote: s.quote, content: s.content, status: s.status,
                    })}
                />
            )}

            {activeTab === 'blog' && (
                <DTable
                    data={blogPosts}
                    columns={[
                        { header: "Title", accessor: "title", className: "font-bold" },
                        { header: "Category", accessor: "category" },
                        { header: "Date", accessor: "date" },
                        { header: "Status", accessor: "status" },
                    ]}
                    title="Blog Posts"
                    onCreate={() => setModal({ mode: "create" })}
                    actions={(p: BlogPost) => rowActions(p.id, {
                        title: p.title, category: p.category, author: p.author,
                        excerpt: p.excerpt, content: p.content, status: p.status,
                    })}
                />
            )}

            {activeTab === 'whatsapp' && (
                <DTable
                    data={groups}
                    columns={[
                        { header: "Group Name", accessor: "name", className: "font-bold" },
                        { header: "Role", accessor: "role" },
                        { header: "Link", accessor: (g: WhatsAppGroup) => <span className="truncate block w-40 text-blue-500">{g.whatsappLink}</span> },
                    ]}
                    title="WhatsApp Groups"
                    onCreate={() => setModal({ mode: "create" })}
                    actions={(g: WhatsAppGroup) => rowActions(g.id, {
                        name: g.name, link: g.whatsappLink, role: g.role, pinnedMessage: g.pinnedMessage,
                    })}
                />
            )}

            {modal && (
                <EntityFormModal
                    title={modal.mode === "create" ? `New ${activeTab}` : `Edit ${activeTab}`}
                    submitLabel={modal.mode === "create" ? "Create" : "Save"}
                    fields={fields}
                    initial={modal.initial}
                    onCancel={() => setModal(null)}
                    onSubmit={save}
                />
            )}
        </div>
    );
}
