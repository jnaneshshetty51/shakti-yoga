"use client";

import { useCallback, useEffect, useState } from "react";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues, type FieldDef } from "@/components/admin/EntityFormModal";
import { PageHeader, PageLoading, Tabs, StatusBadge, TableActions, ActionButton } from "@/components/admin/ui";

type ContentTab = "content" | "story" | "blog" | "whatsapp" | "comments" | "community";
type Subtype = "REEL" | "POST" | "ANNOUNCEMENT";

type Story = {
    id: string; name: string; authorName: string; location: string; plan: string;
    planType: string; rating: number; quote: string; content: string; status: string; imageUrl: string;
};
type BlogPost = {
    id: string; title: string; category: string; date: string; slug: string;
    excerpt: string; content: string; author: string; status: string; imageUrl: string;
    ctaType: string; ctaLabel: string; relatedClassBatchId: string;
};
type WhatsAppGroup = {
    id: string; name: string; role: string; whatsappLink: string; pinnedMessage: string;
};
type ContentRow = {
    id: string; contentType: Subtype; title: string; body: string; caption: string;
    category: string; status: string; instagramUrl: string; imageUrl: string; videoUrl: string;
    ctaType: string; ctaLabel: string; relatedBlogId: string; author: string;
    tags: string; pinned: boolean; notifyOnPublish: boolean;
    important?: boolean; audience?: string; mediaUrls?: string; expiresAt?: string | null;
    publishedAt: string | null; scheduledAt: string | null;
};
type CommentRow = {
    id: string; body: string; hidden: boolean; reportCount: number; createdAt: string;
    author: string; authorEmail: string; contentId: string; contentTitle: string; contentType: string;
};
type CommunityModRow = {
    id: string; body: string; hidden: boolean; reportCount: number; createdAt: string;
    author: string; authorEmail: string; postId?: string; likeCount?: number; commentCount?: number;
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
const CATEGORY_OPTIONS = [
    "YOGA", "BREATHING", "MINDFULNESS", "MOBILITY", "SLEEP", "STRENGTH",
    "WELLNESS", "BEGINNERS", "PHILOSOPHY", "STUDIO", "COMMUNITY",
].map((v) => ({ label: v[0] + v.slice(1).toLowerCase(), value: v }));
const CTA_OPTIONS = [
    { label: "None", value: "none" },
    { label: "Join next class", value: "join_next_class" },
    { label: "View classes", value: "view_classes" },
    { label: "Book therapy", value: "book_therapy" },
    { label: "Open related article", value: "open_blog" },
];

const STORY_FIELDS: FieldDef[] = [
    { name: "authorName", label: "Author Name", required: true },
    { name: "location", label: "Location" },
    { name: "planType", label: "Plan" },
    { name: "rating", label: "Rating (1-5)", type: "number" },
    { name: "imageUrl", label: "Photo", type: "image" },
    { name: "quote", label: "Short Quote", type: "textarea", required: true },
    { name: "content", label: "Full Testimonial", type: "textarea" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
];
const BLOG_CTA_OPTIONS = [
    { label: "None", value: "none" },
    { label: "Join next class", value: "join_next_class" },
    { label: "View classes", value: "view_classes" },
    { label: "Book therapy", value: "book_therapy" },
];

function blogFields(classBatchOptions: { label: string; value: string }[]): FieldDef[] {
    return [
        { name: "title", label: "Title", required: true },
        { name: "slug", label: "URL slug", placeholder: "auto from title if blank" },
        { name: "category", label: "Category", required: true },
        { name: "author", label: "Author" },
        { name: "imageUrl", label: "Thumbnail", type: "image" },
        { name: "excerpt", label: "Excerpt", type: "textarea" },
        { name: "content", label: "Content (Markdown)", type: "textarea", required: true },
        { name: "ctaType", label: "Call to action", type: "select", options: BLOG_CTA_OPTIONS },
        { name: "ctaLabel", label: "CTA button label", placeholder: "e.g. Try today's practice" },
        { name: "relatedClassBatchId", label: "Pairs with class", type: "select", options: classBatchOptions },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
    ];
}
const GROUP_FIELDS: FieldDef[] = [
    { name: "name", label: "Group Name", required: true },
    { name: "link", label: "WhatsApp Link", required: true },
    { name: "role", label: "For Role", type: "select", required: true, options: ROLE_OPTIONS },
    { name: "pinnedMessage", label: "Pinned Message", type: "textarea" },
];

function contentFields(subtype: Subtype, blogOptions: { label: string; value: string }[]): FieldDef[] {
    const media: FieldDef[] =
        subtype === "REEL"
            ? [
                  { name: "videoUrl", label: "Video (self-hosted, plays natively in the app)", type: "video" },
                  { name: "instagramUrl", label: "Instagram URL (optional — shown as \"View on Instagram\")", placeholder: "https://www.instagram.com/reel/…" },
                  { name: "caption", label: "Caption", type: "textarea" },
                  { name: "imageUrl", label: "Thumbnail", type: "image" },
              ]
            : [
                  { name: "body", label: "Body", type: "textarea", required: subtype === "POST" },
                  { name: "imageUrl", label: subtype === "POST" ? "Image" : "Hero image (optional)", type: "image" },
              ];
    return [
        { name: "title", label: "Title", required: true },
        { name: "category", label: "Category", type: "select", required: true, options: CATEGORY_OPTIONS },
        ...media,
        ...(subtype !== "REEL"
            ? [{ name: "mediaUrls", label: "Extra images (one media path per line, from an upload)", type: "textarea" as const }]
            : []),
        { name: "ctaType", label: "Call to action", type: "select", options: CTA_OPTIONS },
        { name: "ctaLabel", label: "CTA button label", placeholder: "e.g. Join evening yoga" },
        { name: "relatedBlogId", label: "Related article", type: "select", options: blogOptions },
        { name: "tags", label: "Tags (comma separated)" },
        { name: "author", label: "Author" },
        { name: "audience", label: "Target plan tiers (blank = everyone)", placeholder: "starter, everyday, family, therapy, trial" },
        ...(subtype === "ANNOUNCEMENT"
            ? [
                  { name: "important", label: "Important — highlight and keep on top", type: "checkbox" as const },
                  { name: "expiresAt", label: "Expires (optional)", type: "datetime-local" as const },
              ]
            : []),
        { name: "pinned", label: "Pin to top of feed", type: "checkbox" },
        { name: "notifyOnPublish", label: "Push a notification when this publishes", type: "checkbox" },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
        { name: "scheduledAt", label: "Schedule for (optional)", type: "datetime-local" },
    ];
}

const SUBTYPE_LABEL: Record<Subtype, string> = { REEL: "Reel", POST: "Post", ANNOUNCEMENT: "Announcement" };

function contentInitial(r: ContentRow): EntityValues {
    return {
        title: r.title, category: r.category, body: r.body, caption: r.caption,
        instagramUrl: r.instagramUrl, imageUrl: r.imageUrl, videoUrl: r.videoUrl, ctaType: r.ctaType || "none",
        ctaLabel: r.ctaLabel, relatedBlogId: r.relatedBlogId, tags: r.tags,
        author: r.author, pinned: r.pinned, status: r.status,
        notifyOnPublish: r.notifyOnPublish,
        audience: r.audience ?? "", important: r.important ?? false,
        mediaUrls: r.mediaUrls ?? "",
        expiresAt: r.expiresAt ? toLocalInput(r.expiresAt) : "",
        scheduledAt: r.scheduledAt ? toLocalInput(r.scheduledAt) : "",
    };
}

/** ISO string -> value for <input type="datetime-local"> (local time, minute precision). */
function toLocalInput(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(+d)) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminContentPage() {
    const [activeTab, setActiveTab] = useState<ContentTab>("content");
    const [content, setContent] = useState<ContentRow[]>([]);
    const [blogOptions, setBlogOptions] = useState<{ label: string; value: string }[]>([]);
    const [classBatchOptions, setClassBatchOptions] = useState<{ label: string; value: string }[]>([]);
    const [counts, setCounts] = useState({ drafts: 0, published: 0, scheduled: 0 });
    const [contentView, setContentView] = useState<"list" | "calendar">("list");
    const [stories, setStories] = useState<Story[]>([]);
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
    const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
    const [comments, setComments] = useState<CommentRow[]>([]);
    const [communityPosts, setCommunityPosts] = useState<CommunityModRow[]>([]);
    const [communityComments, setCommunityComments] = useState<CommunityModRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<
        { mode: "create" | "edit"; initial?: EntityValues; id?: string; subtype?: Subtype } | null
    >(null);

    const fetchContent = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/content');
            if (response.ok) {
                const data = await response.json();
                setStories(data.stories || []);
                setBlogPosts(data.blogPosts || []);
                setGroups(data.groups || []);
                setContent(data.content || []);
                setBlogOptions(data.blogOptions || []);
                setClassBatchOptions(data.classBatchOptions || []);
                setCounts(data.counts || { drafts: 0, published: 0, scheduled: 0 });
            }
        } catch (error) {
            console.error('Failed to fetch content:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchComments = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/content/comments');
            if (res.ok) setComments((await res.json()).comments || []);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    }, []);

    const fetchCommunity = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/content/community');
            if (res.ok) {
                const d = await res.json();
                setCommunityPosts(d.posts || []);
                setCommunityComments(d.comments || []);
            }
        } catch (error) {
            console.error('Failed to fetch community:', error);
        }
    }, []);

    useEffect(() => {
        fetchContent();
        fetchComments();
        fetchCommunity();
    }, [fetchContent, fetchComments, fetchCommunity]);

    const moderateCommunity = async (kind: "post" | "comment", id: string, action: "hide" | "unhide" | "delete") => {
        if (action === "delete") {
            if (!confirm(`Delete this ${kind} permanently?`)) return;
            await fetch(`/api/admin/content/community?kind=${kind}&id=${id}`, { method: "DELETE" });
        } else {
            await fetch('/api/admin/content/community', {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind, id, hidden: action === "hide" }),
            });
        }
        fetchCommunity();
    };

    const moderateComment = async (id: string, action: "hide" | "unhide" | "delete") => {
        if (action === "delete") {
            if (!confirm("Delete this comment permanently?")) return;
            await fetch(`/api/admin/content/comments?id=${id}`, { method: "DELETE" });
        } else {
            await fetch('/api/admin/content/comments', {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, hidden: action === "hide" }),
            });
        }
        fetchComments();
    };

    const fields: FieldDef[] =
        activeTab === "content"
            ? contentFields(modal?.subtype ?? "POST", blogOptions)
            : activeTab === "story" ? STORY_FIELDS
            : activeTab === "blog" ? blogFields(classBatchOptions)
            : GROUP_FIELDS;

    const save = async (values: EntityValues) => {
        const payload: Record<string, unknown> = { ...values, id: modal?.id };
        if (activeTab === "content") payload.contentType = modal?.subtype ?? "POST";
        const res = await fetch(`/api/admin/content?type=${activeTab}`, {
            method: modal?.mode === "edit" ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
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

    const rowActions = (id: string, initial: EntityValues, subtype?: Subtype) => (
        <TableActions>
            <ActionButton onClick={() => setModal({ mode: "edit", id, initial, subtype })}>Edit</ActionButton>
            <ActionButton tone="danger" onClick={() => remove(id)}>Delete</ActionButton>
        </TableActions>
    );

    const setStoryStatus = async (id: string, status: "PUBLISHED" | "ARCHIVED") => {
        await fetch(`/api/admin/content?type=story`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
        });
        fetchContent();
    };

    if (loading) return <PageLoading title="Content Management" />;

    return (
        <div>
            <PageHeader title="Content Management" subtitle="Reels, posts, announcements, blog and community links." />

            <div className="mb-6">
                <Tabs
                    active={activeTab}
                    onChange={(k) => setActiveTab(k as ContentTab)}
                    tabs={[
                        { key: "content", label: "Content", count: content.length },
                        { key: "story", label: "Stories", count: stories.length },
                        { key: "blog", label: "Blog", count: blogPosts.length },
                        { key: "whatsapp", label: "WhatsApp", count: groups.length },
                        { key: "comments", label: "Comments", count: comments.filter((c) => c.reportCount > 0).length || comments.length },
                        { key: "community", label: "Community", count: communityPosts.filter((p) => p.reportCount > 0).length + communityComments.length || communityPosts.length },
                    ]}
                />
            </div>

            {activeTab === 'content' && (
                <>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="text-sm text-gray-500">
                            {counts.published} published · {counts.drafts} draft{counts.drafts === 1 ? "" : "s"}
                            {counts.scheduled ? ` · ${counts.scheduled} scheduled` : ""}
                        </span>
                        <div className="flex gap-1 rounded-full bg-gray-100 p-1 ml-auto text-xs font-semibold">
                            {(["list", "calendar"] as const).map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setContentView(v)}
                                    className={`px-3 py-1 rounded-full capitalize transition-colors ${contentView === v ? "bg-white shadow-sm text-gray-800" : "text-gray-500"}`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            {(["REEL", "POST", "ANNOUNCEMENT"] as Subtype[]).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setModal({ mode: "create", subtype: s })}
                                    className="px-3 py-1.5 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                                >
                                    + {SUBTYPE_LABEL[s]}
                                </button>
                            ))}
                        </div>
                    </div>
                    {contentView === "calendar" ? (
                        <ContentCalendar rows={content} onOpen={(r) => setModal({
                            mode: "edit", id: r.id, subtype: r.contentType, initial: contentInitial(r),
                        })} />
                    ) : (
                        <DTable
                            data={content}
                            columns={[
                                { header: "Title", accessor: "title", className: "font-bold" },
                                { header: "Type", accessor: (r: ContentRow) => SUBTYPE_LABEL[r.contentType] },
                                { header: "Category", accessor: (r: ContentRow) => r.category[0] + r.category.slice(1).toLowerCase() },
                                { header: "Pinned", accessor: (r: ContentRow) => (r.pinned ? "📌" : "") },
                                {
                                    header: "Status",
                                    accessor: (r: ContentRow) =>
                                        r.scheduledAt ? (
                                            <span className="text-xs text-amber-600 font-semibold">
                                                Scheduled {new Date(r.scheduledAt).toLocaleString()}
                                            </span>
                                        ) : (
                                            <StatusBadge status={r.status} />
                                        ),
                                },
                            ]}
                            title="Feed content"
                            actions={(r: ContentRow) => rowActions(r.id, contentInitial(r), r.contentType)}
                        />
                    )}
                </>
            )}

            {activeTab === 'story' && (
                <DTable
                    data={stories}
                    columns={[
                        { header: "Author", accessor: "name", className: "font-bold" },
                        { header: "Location", accessor: "location" },
                        { header: "Rating", accessor: (s: Story) => "★".repeat(s.rating) },
                        { header: "Status", accessor: (r: { status: string }) => <StatusBadge status={r.status} /> },
                    ]}
                    title="Stories & Testimonials"
                    onCreate={() => setModal({ mode: "create" })}
                    actions={(s: Story) => (
                        <TableActions>
                            {s.status !== "PUBLISHED" && (
                                <ActionButton onClick={() => setStoryStatus(s.id, "PUBLISHED")}>Approve</ActionButton>
                            )}
                            {s.status !== "ARCHIVED" && (
                                <ActionButton onClick={() => setStoryStatus(s.id, "ARCHIVED")}>Reject</ActionButton>
                            )}
                            <ActionButton onClick={() => setModal({ mode: "edit", id: s.id, initial: {
                                authorName: s.authorName, location: s.location, planType: s.planType,
                                rating: s.rating, quote: s.quote, content: s.content, status: s.status, imageUrl: s.imageUrl,
                            } })}>Edit</ActionButton>
                            <ActionButton tone="danger" onClick={() => remove(s.id)}>Delete</ActionButton>
                        </TableActions>
                    )}
                />
            )}

            {activeTab === 'blog' && (
                <DTable
                    data={blogPosts}
                    columns={[
                        { header: "Title", accessor: "title", className: "font-bold" },
                        { header: "Category", accessor: "category" },
                        { header: "Date", accessor: "date" },
                        { header: "Status", accessor: (r: { status: string }) => <StatusBadge status={r.status} /> },
                    ]}
                    title="Blog Posts"
                    onCreate={() => setModal({ mode: "create" })}
                    actions={(p: BlogPost) => rowActions(p.id, {
                        title: p.title, category: p.category, author: p.author,
                        excerpt: p.excerpt, content: p.content, status: p.status, imageUrl: p.imageUrl,
                        slug: p.slug, ctaType: p.ctaType || "none", ctaLabel: p.ctaLabel,
                        relatedClassBatchId: p.relatedClassBatchId,
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

            {activeTab === 'comments' && (
                <DTable
                    data={comments}
                    columns={[
                        {
                            header: "Comment",
                            accessor: (c: CommentRow) => (
                                <span className={c.hidden ? "line-through text-gray-400" : ""}>{c.body}</span>
                            ),
                            className: "max-w-sm",
                        },
                        { header: "By", accessor: "author" },
                        { header: "On", accessor: (c: CommentRow) => <span className="text-gray-500">{c.contentTitle}</span> },
                        {
                            header: "Reports",
                            accessor: (c: CommentRow) =>
                                c.reportCount > 0 ? <span className="text-red-600 font-bold">{c.reportCount}</span> : "—",
                        },
                        { header: "State", accessor: (c: CommentRow) => (c.hidden ? "Hidden" : "Visible") },
                    ]}
                    title="Comments & moderation"
                    actions={(c: CommentRow) => (
                        <TableActions>
                            {c.hidden ? (
                                <ActionButton onClick={() => moderateComment(c.id, "unhide")}>Unhide</ActionButton>
                            ) : (
                                <ActionButton onClick={() => moderateComment(c.id, "hide")}>Hide</ActionButton>
                            )}
                            <ActionButton tone="danger" onClick={() => moderateComment(c.id, "delete")}>Delete</ActionButton>
                        </TableActions>
                    )}
                />
            )}

            {activeTab === 'community' && (
                <div className="space-y-8">
                    <DTable
                        data={communityPosts}
                        columns={[
                            {
                                header: "Post",
                                accessor: (r: CommunityModRow) => (
                                    <span className={r.hidden ? "line-through text-gray-400" : ""}>{r.body}</span>
                                ),
                                className: "max-w-sm",
                            },
                            { header: "By", accessor: "author" },
                            { header: "♥ / 💬", accessor: (r: CommunityModRow) => `${r.likeCount ?? 0} / ${r.commentCount ?? 0}` },
                            {
                                header: "Reports",
                                accessor: (r: CommunityModRow) =>
                                    r.reportCount > 0 ? <span className="text-red-600 font-bold">{r.reportCount}</span> : "—",
                            },
                            { header: "State", accessor: (r: CommunityModRow) => (r.hidden ? "Hidden" : "Visible") },
                        ]}
                        title="Community posts"
                        actions={(r: CommunityModRow) => (
                            <TableActions>
                                {r.hidden
                                    ? <ActionButton onClick={() => moderateCommunity("post", r.id, "unhide")}>Unhide</ActionButton>
                                    : <ActionButton onClick={() => moderateCommunity("post", r.id, "hide")}>Hide</ActionButton>}
                                <ActionButton tone="danger" onClick={() => moderateCommunity("post", r.id, "delete")}>Delete</ActionButton>
                            </TableActions>
                        )}
                    />
                    {communityComments.length > 0 && (
                        <DTable
                            data={communityComments}
                            columns={[
                                {
                                    header: "Reported comment",
                                    accessor: (r: CommunityModRow) => (
                                        <span className={r.hidden ? "line-through text-gray-400" : ""}>{r.body}</span>
                                    ),
                                    className: "max-w-sm",
                                },
                                { header: "By", accessor: "author" },
                                { header: "Reports", accessor: (r: CommunityModRow) => <span className="text-red-600 font-bold">{r.reportCount}</span> },
                                { header: "State", accessor: (r: CommunityModRow) => (r.hidden ? "Hidden" : "Visible") },
                            ]}
                            title="Reported community comments"
                            actions={(r: CommunityModRow) => (
                                <TableActions>
                                    {r.hidden
                                        ? <ActionButton onClick={() => moderateCommunity("comment", r.id, "unhide")}>Unhide</ActionButton>
                                        : <ActionButton onClick={() => moderateCommunity("comment", r.id, "hide")}>Hide</ActionButton>}
                                    <ActionButton tone="danger" onClick={() => moderateCommunity("comment", r.id, "delete")}>Delete</ActionButton>
                                </TableActions>
                            )}
                        />
                    )}
                </div>
            )}

            {modal && activeTab !== 'comments' && activeTab !== 'community' && (
                <EntityFormModal
                    title={
                        activeTab === "content"
                            ? `${modal.mode === "create" ? "New" : "Edit"} ${SUBTYPE_LABEL[modal.subtype ?? "POST"]}`
                            : modal.mode === "create" ? `New ${activeTab}` : `Edit ${activeTab}`
                    }
                    submitLabel={modal.mode === "create" ? "Create" : "Save"}
                    fields={fields}
                    initial={modal.initial}
                    onCancel={() => setModal(null)}
                    onSubmit={save}
                    uploadImage={async (file) => {
                        const fd = new FormData();
                        fd.append("kind", activeTab === "story" ? "story" : activeTab === "content" ? "content" : "blog");
                        fd.append("file", file);
                        const res = await fetch("/api/admin/content/image", { method: "POST", body: fd });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Upload failed");
                        return data.url as string;
                    }}
                    uploadVideo={async (file) => {
                        const fd = new FormData();
                        fd.append("file", file);
                        const res = await fetch("/api/admin/content/video", { method: "POST", body: fd });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Upload failed");
                        return data.url as string;
                    }}
                />
            )}
        </div>
    );
}

function ContentCalendar({ rows, onOpen }: { rows: ContentRow[]; onOpen: (r: ContentRow) => void }) {
    const [month, setMonth] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    const y = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();

    const byDay = new Map<number, ContentRow[]>();
    for (const r of rows) {
        const iso = r.scheduledAt ?? r.publishedAt;
        if (!iso) continue;
        const d = new Date(iso);
        if (d.getFullYear() !== y || d.getMonth() !== m) continue;
        const arr = byDay.get(d.getDate()) ?? [];
        arr.push(r);
        byDay.set(d.getDate(), arr);
    }

    const cells: (number | null)[] = [
        ...Array.from({ length: first }, () => null),
        ...Array.from({ length: days }, (_, i) => i + 1),
    ];
    const todayKey = new Date().toDateString();

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
                <button onClick={() => setMonth(new Date(y, m - 1, 1))} className="px-2 py-1 rounded hover:bg-gray-100 text-gray-500">←</button>
                <h3 className="font-serif text-lg text-gray-800">
                    {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </h3>
                <button onClick={() => setMonth(new Date(y, m + 1, 1))} className="px-2 py-1 rounded hover:bg-gray-100 text-gray-500">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="text-center py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                    if (day === null) return <div key={i} />;
                    const items = byDay.get(day) ?? [];
                    const isToday = new Date(y, m, day).toDateString() === todayKey;
                    return (
                        <div key={i} className={`min-h-[76px] rounded-lg border p-1.5 text-xs ${isToday ? "border-primary/40 bg-primary/5" : "border-gray-100"}`}>
                            <div className="text-gray-400 mb-1">{day}</div>
                            <div className="space-y-1">
                                {items.slice(0, 3).map((r) => (
                                    <button
                                        key={r.id}
                                        onClick={() => onOpen(r)}
                                        title={r.title}
                                        className={`block w-full text-left truncate rounded px-1 py-0.5 ${r.scheduledAt ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
                                    >
                                        {r.title}
                                    </button>
                                ))}
                                {items.length > 3 ? <div className="text-gray-400 px-1">+{items.length - 3} more</div> : null}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 inline-block" /> Published</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 inline-block" /> Scheduled</span>
            </div>
        </div>
    );
}
