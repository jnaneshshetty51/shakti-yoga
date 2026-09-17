"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DTable from "@/components/admin/DTable";
import EntityFormModal, { type EntityValues, type FieldDef } from "@/components/admin/EntityFormModal";
import { PageHeader, PageLoading, Tabs, StatusBadge, TableActions, ActionButton, useConfirmDialog } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import { CONTENT_TYPES, CONTENT_TYPE_LABEL, CATEGORY_LABEL, DIFFICULTY_LABEL, ACCESS_LABEL } from "@/lib/content";
import { AdminMessagesContent } from "@/app/admin/messages/page";
import { AdminBroadcastContent } from "@/app/admin/broadcast/page";
import { AdminWhatsAppContent } from "@/app/admin/community/page";
import { AdminFaqsContent } from "@/app/admin/faqs/page";
import { AdminPagesContent } from "@/app/admin/pages/page";
import { AdminSiteContentContent } from "@/app/admin/site-content/page";
import { AdminSupportContent } from "@/app/admin/support/page";

type ContentTab = "content" | "story" | "comments" | "community" | "messages" | "broadcast" | "whatsapp" | "faqs" | "pages" | "site-content" | "support";
type Subtype = (typeof CONTENT_TYPES)[number];

type Story = {
    id: string; name: string; authorName: string; location: string; plan: string;
    planType: string; rating: number; quote: string; content: string; status: string; imageUrl: string;
};
type ContentRow = {
    id: string; contentType: Subtype; title: string; slug: string; excerpt: string; body: string; caption: string; steps: string;
    category: string; status: string; instagramUrl: string; imageUrl: string; videoUrl: string; audioUrl: string;
    durationMin: number | ""; difficulty: string; language: string;
    ctaType: string; ctaLabel: string; relatedContentId: string; relatedClassBatchId: string; author: string;
    tags: string; pinned: boolean; featured: boolean; notifyOnPublish: boolean; access: string;
    important?: boolean; audience?: string; mediaUrls?: string; expiresAt?: string | null;
    publishedAt: string | null; scheduledAt: string | null;
    metaTitle: string; metaDescription: string;
    submittedForReviewAt: string | null; reviewedAt: string | null; reviewNote: string; approvedAt: string | null;
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
    { label: "In review", value: "IN_REVIEW" },
    { label: "Approved", value: "APPROVED" },
    { label: "Published", value: "PUBLISHED" },
    { label: "Archived", value: "ARCHIVED" },
];
const STORY_STATUS_OPTIONS = [
    { label: "Draft", value: "DRAFT" },
    { label: "Published", value: "PUBLISHED" },
    { label: "Archived", value: "ARCHIVED" },
];
const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ label, value }));
const DIFFICULTY_OPTIONS = Object.entries(DIFFICULTY_LABEL).map(([value, label]) => ({ label, value }));
const ACCESS_OPTIONS = Object.entries(ACCESS_LABEL).map(([value, label]) => ({ label, value }));
const CTA_OPTIONS = [
    { label: "None", value: "none" },
    { label: "Join next class", value: "join_next_class" },
    { label: "View classes", value: "view_classes" },
    { label: "Book therapy", value: "book_therapy" },
    { label: "Open related content", value: "open_content" },
    { label: "Open related practice", value: "open_practice" },
];

const STORY_FIELDS: FieldDef[] = [
    { name: "authorName", label: "Author Name", required: true },
    { name: "location", label: "Location" },
    { name: "planType", label: "Plan" },
    { name: "rating", label: "Rating (1-5)", type: "number" },
    { name: "imageUrl", label: "Photo", type: "image" },
    { name: "quote", label: "Short Quote", type: "textarea", required: true },
    { name: "content", label: "Full Testimonial", type: "textarea" },
    { name: "status", label: "Status", type: "select", options: STORY_STATUS_OPTIONS },
];

const SEO_TYPES: Subtype[] = ["ARTICLE", "FOUNDER_MESSAGE"];

function contentFields(subtype: Subtype, contentOptions: { label: string; value: string }[], classBatchOptions: { label: string; value: string }[]): FieldDef[] {
    const media: FieldDef[] =
        subtype === "VIDEO"
            ? [
                  { name: "videoUrl", label: "Video (self-hosted, plays natively in the app)", type: "video" },
                  { name: "instagramUrl", label: "Instagram URL (optional — shown as \"View on Instagram\")", placeholder: "https://www.instagram.com/reel/…" },
                  { name: "caption", label: "Caption", type: "textarea" },
                  { name: "imageUrl", label: "Thumbnail", type: "image" },
              ]
            : subtype === "AUDIO"
            ? [
                  { name: "audioUrl", label: "Audio file (MP3 / M4A / WAV)", type: "audio" },
                  { name: "caption", label: "Caption", type: "textarea" },
                  { name: "imageUrl", label: "Thumbnail", type: "image" },
              ]
            : subtype === "ARTICLE"
            ? [
                  { name: "slug", label: "URL slug", placeholder: "auto from title if blank" },
                  { name: "excerpt", label: "Excerpt", type: "textarea" },
                  { name: "body", label: "Content (Markdown)", type: "textarea", required: true },
                  { name: "imageUrl", label: "Thumbnail", type: "image" },
              ]
            : subtype === "FOUNDER_MESSAGE"
            ? [
                  { name: "slug", label: "URL slug", placeholder: "auto from title if blank" },
                  { name: "body", label: "Message (Markdown)", type: "textarea", required: true },
                  { name: "videoUrl", label: "Video (optional)", type: "video" },
                  { name: "audioUrl", label: "Audio (optional)", type: "audio" },
                  { name: "imageUrl", label: "Thumbnail", type: "image" },
              ]
            : subtype === "ANNOUNCEMENT"
            ? [
                  { name: "body", label: "Body", type: "textarea", required: true },
                  { name: "imageUrl", label: "Hero image (optional)", type: "image" },
              ]
            : [
                  // SHORT_PRACTICE / TAKE_A_MOMENT
                  { name: "body", label: "Intro", type: "textarea" },
                  { name: "steps", label: "Steps (markdown list)", type: "textarea" },
                  { name: "durationMin", label: "Duration (minutes)", type: "number", required: true },
                  { name: "difficulty", label: "Difficulty", type: "select", options: DIFFICULTY_OPTIONS },
                  { name: "videoUrl", label: "Video (optional)", type: "video" },
                  { name: "imageUrl", label: "Thumbnail", type: "image" },
              ];

    return [
        { name: "title", label: "Title", required: true },
        { name: "category", label: "Category / Practice type", type: "select", required: true, options: CATEGORY_OPTIONS },
        ...media,
        ...(SEO_TYPES.includes(subtype) ? [
            { name: "metaTitle", label: "SEO title (optional)" },
            { name: "metaDescription", label: "SEO description (optional)" },
        ] as FieldDef[] : []),
        { name: "mediaUrls", label: "Extra images (one media path per line, from an upload)", type: "textarea" },
        { name: "ctaType", label: "Call to action", type: "select", options: CTA_OPTIONS },
        { name: "ctaLabel", label: "CTA button label", placeholder: "e.g. Join evening yoga" },
        { name: "relatedContentId", label: "Pairs with (related content)", type: "select", options: contentOptions },
        { name: "relatedClassBatchId", label: "Pairs with class", type: "select", options: classBatchOptions },
        { name: "tags", label: "Tags (comma separated)" },
        { name: "author", label: "Public author", placeholder: "e.g. Acharya Swastik" },
        { name: "language", label: "Language", placeholder: "English" },
        { name: "access", label: "Who can access this?", type: "select", options: ACCESS_OPTIONS },
        { name: "audience", label: "Specific plan tiers (only used when Access = Membership required)", placeholder: "starter, everyday, family, therapy, trial" },
        ...(subtype === "ANNOUNCEMENT"
            ? [
                  { name: "important", label: "Important — highlight and keep on top", type: "checkbox" as const },
                  { name: "expiresAt", label: "Unpublish at (optional)", type: "datetime-local" as const },
              ]
            : []),
        { name: "featured", label: "Featured — surface on Home / Practice", type: "checkbox" },
        { name: "pinned", label: "Pin to top of its list", type: "checkbox" },
        { name: "notifyOnPublish", label: "Push a notification when this publishes", type: "checkbox" },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
        { name: "scheduledAt", label: "Schedule publish for (optional — needs Approved status)", type: "datetime-local" },
        { name: "reviewNote", label: "Review note (internal, optional)", type: "textarea" },
    ];
}

// Only the Content Library list is a bounded, ever-growing resource
// collection — worth real server-side pagination. Stories, comments and
// community moderation are small staff-curated sets or queues.
const PAGE_SIZE = 25;

function contentInitial(r: ContentRow): EntityValues {
    return {
        title: r.title, category: r.category, slug: r.slug, excerpt: r.excerpt, body: r.body, caption: r.caption, steps: r.steps,
        instagramUrl: r.instagramUrl, imageUrl: r.imageUrl, videoUrl: r.videoUrl, audioUrl: r.audioUrl,
        durationMin: r.durationMin, difficulty: r.difficulty, language: r.language || "English",
        ctaType: r.ctaType || "none", ctaLabel: r.ctaLabel, relatedContentId: r.relatedContentId, relatedClassBatchId: r.relatedClassBatchId,
        tags: r.tags, author: r.author, pinned: r.pinned, featured: r.featured, status: r.status, access: r.access || "PUBLIC",
        notifyOnPublish: r.notifyOnPublish,
        audience: r.audience ?? "", important: r.important ?? false,
        mediaUrls: r.mediaUrls ?? "",
        metaTitle: r.metaTitle, metaDescription: r.metaDescription,
        reviewNote: r.reviewNote,
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
    const router = useRouter();
    const { showToast } = useToast();
    const { confirm, dialog } = useConfirmDialog();
    const [activeTab, setActiveTab] = useState<ContentTab>("content");
    const [content, setContent] = useState<ContentRow[]>([]);
    const [contentPage, setContentPage] = useState(1);
    const [contentTotalCount, setContentTotalCount] = useState(0);
    const [contentSearch, setContentSearch] = useState("");
    const [contentSort, setContentSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    // The calendar view needs a fuller cross-month picture than one 25-row
    // page of the (now server-paginated) list — kept as its own snapshot
    // (capped at the route's page-size ceiling) so switching to "calendar"
    // doesn't only show whatever page the list last landed on.
    const [calendarContent, setCalendarContent] = useState<ContentRow[]>([]);
    const [contentOptions, setContentOptions] = useState<{ label: string; value: string }[]>([]);
    const [classBatchOptions, setClassBatchOptions] = useState<{ label: string; value: string }[]>([]);
    const [counts, setCounts] = useState({ drafts: 0, inReview: 0, published: 0, scheduled: 0, archived: 0 });
    const [canApprove, setCanApprove] = useState(false);
    const [contentView, setContentView] = useState<"list" | "calendar">("list");
    const [stories, setStories] = useState<Story[]>([]);
    const [comments, setComments] = useState<CommentRow[]>([]);
    const [communityPosts, setCommunityPosts] = useState<CommunityModRow[]>([]);
    const [communityComments, setCommunityComments] = useState<CommunityModRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<
        { mode: "create" | "edit"; initial?: EntityValues; id?: string; subtype?: Subtype } | null
    >(null);

    const fetchContent = useCallback(async () => {
        try {
            const params = new URLSearchParams({ page: String(contentPage), pageSize: String(PAGE_SIZE) });
            if (contentSearch) params.set('q', contentSearch);
            if (statusFilter) params.set('status', statusFilter);
            if (typeFilter) params.set('contentType', typeFilter);
            if (contentSort) { params.set('sortKey', contentSort.key); params.set('sortDir', contentSort.direction); }
            const response = await fetch(`/api/admin/content?${params}`);
            if (response.ok) {
                const data = await response.json();
                setStories(data.stories || []);
                setContent(data.content || []);
                setContentTotalCount(data.totalCount ?? 0);
                setContentOptions(data.contentOptions || []);
                setClassBatchOptions(data.classBatchOptions || []);
                setCounts(data.counts || { drafts: 0, inReview: 0, published: 0, scheduled: 0, archived: 0 });
                setCanApprove(!!data.canApprove);
            }
        } catch (error) {
            console.error('Failed to fetch content:', error);
        } finally {
            setLoading(false);
        }
    }, [contentPage, contentSearch, statusFilter, typeFilter, contentSort]);

    const fetchCalendarContent = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/content?page=1&pageSize=100');
            if (response.ok) {
                const data = await response.json();
                setCalendarContent(data.content || []);
            }
        } catch (error) {
            console.error('Failed to fetch content calendar:', error);
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
        if (typeof window !== "undefined") {
            const tabParam = new URLSearchParams(window.location.search).get("tab") as ContentTab | null;
            if (tabParam && ["content", "story", "comments", "community", "messages", "broadcast", "whatsapp", "faqs", "pages", "site-content", "support"].includes(tabParam)) {
                setActiveTab(tabParam);
            }
        }
        fetchComments();
        fetchCommunity();
        fetchCalendarContent();
    }, [fetchComments, fetchCommunity, fetchCalendarContent]);

    // The Content Library's own pagination/search/sort/filters — separate from
    // the mount-only effect above so paging the "content" tab doesn't refetch
    // comments/community every time.
    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    const moderateCommunity = async (kind: "post" | "comment", id: string, action: "hide" | "unhide" | "delete") => {
        if (action === "delete") {
            const ok = await confirm({
                title: `Delete this ${kind} permanently?`,
                confirmLabel: "Delete",
                tone: "danger",
            });
            if (!ok) return;
        }
        const res = action === "delete"
            ? await fetch(`/api/admin/content/community?kind=${kind}&id=${id}`, { method: "DELETE" })
            : await fetch('/api/admin/content/community', {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind, id, hidden: action === "hide" }),
            });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast("error", data.error || "Action failed.");
            return;
        }
        showToast("success", action === "delete" ? `${kind === "post" ? "Post" : "Comment"} deleted.` : action === "hide" ? "Hidden." : "Unhidden.");
        fetchCommunity();
    };

    const moderateComment = async (id: string, action: "hide" | "unhide" | "delete") => {
        if (action === "delete") {
            const ok = await confirm({
                title: "Delete this comment permanently?",
                confirmLabel: "Delete",
                tone: "danger",
            });
            if (!ok) return;
        }
        const res = action === "delete"
            ? await fetch(`/api/admin/content/comments?id=${id}`, { method: "DELETE" })
            : await fetch('/api/admin/content/comments', {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, hidden: action === "hide" }),
            });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast("error", data.error || "Action failed.");
            return;
        }
        showToast("success", action === "delete" ? "Comment deleted." : action === "hide" ? "Hidden." : "Unhidden.");
        fetchComments();
    };

    const fields: FieldDef[] =
        activeTab === "content"
            ? contentFields(modal?.subtype ?? "ARTICLE", contentOptions, classBatchOptions)
            : STORY_FIELDS;

    const save = async (values: EntityValues) => {
        const payload: Record<string, unknown> = { ...values, id: modal?.id };
        if (activeTab === "content") payload.contentType = modal?.subtype ?? "ARTICLE";
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
        if (activeTab === "content") fetchCalendarContent();
    };

    const setContentStatus = async (id: string, status: string) => {
        const res = await fetch(`/api/admin/content?type=content`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast("error", data.error || "Action failed.");
            return;
        }
        showToast("success", status === "APPROVED" ? "Approved." : status === "PUBLISHED" ? "Published." : "Sent back to draft.");
        fetchContent();
        fetchCalendarContent();
    };

    const remove = async (id: string) => {
        const target = activeTab === "content" ? content.find((c) => c.id === id) : null;
        const willArchiveOnly = activeTab === "content" && target && target.status !== "DRAFT" && target.status !== "ARCHIVED";
        const ok = await confirm({
            title: willArchiveOnly ? "Archive this content?" : "Delete this item?",
            message: willArchiveOnly ? "Published/reviewed content is archived, not deleted, so history and analytics are preserved. Delete permanently from Archived." : undefined,
            confirmLabel: willArchiveOnly ? "Archive" : "Delete",
            tone: "danger",
        });
        if (!ok) return;
        const res = await fetch(`/api/admin/content?type=${activeTab}&id=${id}`, { method: "DELETE" });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast("error", data.error || "Delete failed.");
            return;
        }
        const data = await res.json().catch(() => ({}));
        showToast("success", data.archived ? "Archived." : "Deleted.");
        // Removing the last row on a page beyond the first would otherwise
        // leave the admin looking at a page that no longer exists — only the
        // "content" (Content Library) list is server-paginated.
        if (activeTab === "content" && content.length === 1 && contentPage > 1) setContentPage((p) => p - 1);
        else fetchContent();
        if (activeTab === "content") fetchCalendarContent();
    };

    const rowActions = (r: ContentRow) => (
        <TableActions>
            {canApprove && r.status === "IN_REVIEW" && (
                <>
                    <ActionButton onClick={() => setContentStatus(r.id, "APPROVED")}>Approve</ActionButton>
                    <ActionButton onClick={() => setContentStatus(r.id, "DRAFT")}>Send back</ActionButton>
                </>
            )}
            {canApprove && r.status === "APPROVED" && !r.scheduledAt && (
                <ActionButton onClick={() => setContentStatus(r.id, "PUBLISHED")}>Publish</ActionButton>
            )}
            {r.contentType === "ARTICLE" && r.status === "PUBLISHED" && r.slug && (
                <a href={`/blog/${r.slug}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand hover:text-brand-strong transition-colors">
                    View live
                </a>
            )}
            <ActionButton
                onClick={() => {
                    if (r.contentType === "ARTICLE") {
                        router.push(`/admin/blog/${r.id}`);
                    } else {
                        setModal({ mode: "edit", id: r.id, initial: contentInitial(r), subtype: r.contentType });
                    }
                }}
            >
                Edit
            </ActionButton>
            <ActionButton tone="danger" onClick={() => remove(r.id)}>{r.status === "ARCHIVED" ? "Delete" : r.status === "DRAFT" ? "Delete" : "Archive"}</ActionButton>
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
            {dialog}
            <PageHeader title="Content & Communication" subtitle="Videos, audio, articles, practices, founder messages, announcements, and how they reach students — one engagement centre." />

            <div className="mb-6">
                <Tabs
                    active={activeTab}
                    onChange={(k) => setActiveTab(k as ContentTab)}
                    tabs={[
                        { key: "content", label: "Library", count: contentTotalCount },
                        { key: "story", label: "Testimonials", count: stories.length },
                        { key: "comments", label: "Comments", count: comments.filter((c) => c.reportCount > 0).length || comments.length },
                        { key: "community", label: "Community Forum", count: communityPosts.filter((p) => p.reportCount > 0).length + communityComments.length || communityPosts.length },
                        { key: "messages", label: "Contact Inquiries" },
                        { key: "broadcast", label: "Push Broadcast" },
                        { key: "whatsapp", label: "WhatsApp" },
                        { key: "faqs", label: "FAQ" },
                        { key: "pages", label: "Pages CMS" },
                        { key: "site-content", label: "Site Content" },
                        { key: "support", label: "Support" },
                    ]}
                />
            </div>

            {activeTab === 'messages' && <AdminMessagesContent embedded />}
            {activeTab === 'broadcast' && <AdminBroadcastContent embedded />}
            {activeTab === 'whatsapp' && <AdminWhatsAppContent embedded />}
            {activeTab === 'faqs' && <AdminFaqsContent embedded />}
            {activeTab === 'pages' && <AdminPagesContent embedded />}
            {activeTab === 'site-content' && <AdminSiteContentContent embedded />}
            {activeTab === 'support' && <AdminSupportContent embedded />}

            {activeTab === 'content' && (
                <>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="text-sm text-gray-500">
                            {counts.published} published · {counts.drafts} draft{counts.drafts === 1 ? "" : "s"}
                            {counts.inReview ? ` · ${counts.inReview} in review` : ""}
                            {counts.scheduled ? ` · ${counts.scheduled} scheduled` : ""}
                            {counts.archived ? ` · ${counts.archived} archived` : ""}
                        </span>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setContentPage(1); }}
                            className="text-xs rounded-full border border-hairline px-3 py-1.5 bg-surface"
                        >
                            <option value="">All statuses</option>
                            {[...STATUS_OPTIONS, { label: "Scheduled", value: "SCHEDULED" }].map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        <select
                            value={typeFilter}
                            onChange={(e) => { setTypeFilter(e.target.value); setContentPage(1); }}
                            className="text-xs rounded-full border border-hairline px-3 py-1.5 bg-surface"
                        >
                            <option value="">All types</option>
                            {CONTENT_TYPES.map((t) => (
                                <option key={t} value={t}>{CONTENT_TYPE_LABEL[t]}</option>
                            ))}
                        </select>
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
                        <div className="flex flex-wrap gap-2">
                            {CONTENT_TYPES.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => {
                                        if (s === "ARTICLE") {
                                            router.push("/admin/blog/new");
                                        } else {
                                            setModal({ mode: "create", subtype: s });
                                        }
                                    }}
                                    className="px-3 py-1.5 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                                >
                                    + {CONTENT_TYPE_LABEL[s]}
                                </button>
                            ))}
                        </div>
                    </div>
                    {contentView === "calendar" ? (
                        <ContentCalendar
                            rows={calendarContent}
                            onOpen={(r) => {
                                if (r.contentType === "ARTICLE") {
                                    router.push(`/admin/blog/${r.id}`);
                                } else {
                                    setModal({
                                        mode: "edit",
                                        id: r.id,
                                        subtype: r.contentType,
                                        initial: contentInitial(r),
                                    });
                                }
                            }}
                        />
                    ) : (
                        <DTable
                            data={content}
                            columns={[
                                { header: "Title", accessor: "title", className: "font-bold", sortable: true },
                                { header: "Type", accessor: (r: ContentRow) => CONTENT_TYPE_LABEL[r.contentType] },
                                { header: "Category", accessor: (r: ContentRow) => CATEGORY_LABEL[r.category as keyof typeof CATEGORY_LABEL] ?? r.category },
                                { header: "Access", accessor: (r: ContentRow) => ACCESS_LABEL[r.access as keyof typeof ACCESS_LABEL] ?? r.access },
                                { header: "Featured", accessor: (r: ContentRow) => (r.featured ? "⭐" : r.pinned ? "📌" : "") },
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
                            title="Content"
                            server={{
                                page: contentPage,
                                pageSize: PAGE_SIZE,
                                totalCount: contentTotalCount,
                                onPageChange: setContentPage,
                                onSearchChange: (q) => { setContentSearch(q); setContentPage(1); },
                                onSortChange: (key, direction) => setContentSort({ key, direction }),
                            }}
                            actions={(r: ContentRow) => rowActions(r)}
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
                    title="Testimonials"
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

            {modal && (activeTab === 'content' || activeTab === 'story') && (
                <EntityFormModal
                    title={
                        activeTab === "content"
                            ? `${modal.mode === "create" ? "New" : "Edit"} ${CONTENT_TYPE_LABEL[modal.subtype ?? "ARTICLE"]}`
                            : modal.mode === "create" ? `New ${activeTab}` : `Edit ${activeTab}`
                    }
                    submitLabel={modal.mode === "create" ? "Create" : "Save"}
                    fields={fields}
                    initial={modal.initial}
                    onCancel={() => setModal(null)}
                    onSubmit={save}
                    uploadImage={async (file) => {
                        const fd = new FormData();
                        fd.append("kind", activeTab === "story" ? "story" : "content");
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
                    uploadAudio={async (file) => {
                        const fd = new FormData();
                        fd.append("file", file);
                        const res = await fetch("/api/admin/content/audio", { method: "POST", body: fd });
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
            <div className="overflow-x-auto">
            <div className="min-w-[560px]">
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
            </div>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 inline-block" /> Published</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 inline-block" /> Scheduled</span>
            </div>
        </div>
    );
}
