"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LuNewspaper } from "react-icons/lu";
import DTable from "@/components/admin/DTable";
import { PageHeader, StatusBadge, TableActions, ActionButton, useConfirmDialog, EmptyState } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import { CATEGORY_LABEL } from "@/lib/content";

type PostRow = {
    id: string;
    title: string;
    slug: string;
    category: string;
    status: string;
    author: string;
    scheduledAt: string | null;
    publishedAt: string | null;
};

const STATUS_TABS = [
    { key: "", label: "All" },
    { key: "PUBLISHED", label: "Published" },
    { key: "DRAFT", label: "Drafts" },
    { key: "IN_REVIEW", label: "In review" },
    { key: "APPROVED", label: "Approved" },
    { key: "SCHEDULED", label: "Scheduled" },
    { key: "ARCHIVED", label: "Archived" },
];

const PAGE_SIZE = 20;

export default function AdminBlogPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const { confirm, dialog } = useConfirmDialog();

    const [posts, setPosts] = useState<PostRow[]>([]);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [canApprove, setCanApprove] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchPosts = useCallback(async () => {
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), contentType: "ARTICLE" });
            if (search) params.set("q", search);
            if (status) params.set("status", status);
            const res = await fetch(`/api/admin/content?${params}`);
            if (res.ok) {
                const data = await res.json();
                setPosts(data.content || []);
                setTotalCount(data.totalCount ?? 0);
                setCanApprove(!!data.canApprove);
            }
        } finally {
            setLoading(false);
        }
    }, [page, search, status]);

    // One cheap pageSize=1 request per status tab, just to read back its
    // totalCount — mirrors WordPress's "All (12) | Published (8) | Drafts (3)"
    // status strip. Scoped to contentType=ARTICLE so it never mixes in the
    // other six content types the shared Content Library counts include.
    const fetchTabCounts = useCallback(async () => {
        const entries = await Promise.all(
            STATUS_TABS.map(async (t) => {
                const params = new URLSearchParams({ page: "1", pageSize: "1", contentType: "ARTICLE" });
                if (t.key) params.set("status", t.key);
                const res = await fetch(`/api/admin/content?${params}`);
                const data = res.ok ? await res.json() : { totalCount: 0 };
                return [t.key, data.totalCount ?? 0] as const;
            }),
        );
        setCounts(Object.fromEntries(entries));
    }, []);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    useEffect(() => {
        fetchTabCounts();
    }, [fetchTabCounts, posts.length]);

    const remove = async (row: PostRow) => {
        const willArchiveOnly = row.status !== "DRAFT" && row.status !== "ARCHIVED";
        const ok = await confirm({
            title: willArchiveOnly ? "Archive this post?" : "Delete this post?",
            message: willArchiveOnly
                ? "Published/reviewed posts are archived, not deleted, so history and analytics are preserved. Delete permanently from Archived."
                : undefined,
            confirmLabel: willArchiveOnly ? "Archive" : "Delete",
            tone: "danger",
        });
        if (!ok) return;
        const res = await fetch(`/api/admin/content?type=content&id=${row.id}`, { method: "DELETE" });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast("error", data.error || "Delete failed.");
            return;
        }
        const data = await res.json().catch(() => ({}));
        showToast("success", data.archived ? "Archived." : "Deleted.");
        if (posts.length === 1 && page > 1) setPage((p) => p - 1);
        else fetchPosts();
    };

    const setPostStatus = async (id: string, next: string) => {
        const res = await fetch(`/api/admin/content?type=content`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status: next }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast("error", data.error || "Action failed.");
            return;
        }
        showToast("success", next === "APPROVED" ? "Approved." : next === "PUBLISHED" ? "Published." : "Sent back to draft.");
        fetchPosts();
    };

    return (
        <div>
            {dialog}
            <PageHeader
                title="Blog"
                subtitle="Write and publish articles for the public blog — a dedicated view over the same Content library, scoped to Article posts."
            >
                <button
                    onClick={() => router.push("/admin/blog/new")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                    + Add New Post
                </button>
            </PageHeader>

            <div className="flex flex-wrap items-center gap-1 mb-4 text-sm">
                {STATUS_TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => { setStatus(t.key); setPage(1); }}
                        className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                            status === t.key ? "bg-primary/10 text-primary" : "text-ink-muted hover:bg-black/[0.04]"
                        }`}
                    >
                        {t.label}
                        <span className="ml-1 text-xs opacity-70">({counts[t.key] ?? 0})</span>
                    </button>
                ))}
            </div>

            {!loading && posts.length === 0 && !search && !status ? (
                <EmptyState
                    icon={LuNewspaper}
                    title="No posts yet"
                    hint="Write your first blog post — it starts as a draft until you publish it."
                    action={
                        <button
                            onClick={() => router.push("/admin/blog/new")}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                        >
                            + Add New Post
                        </button>
                    }
                />
            ) : (
                <DTable
                    data={posts}
                    columns={[
                        { header: "Title", accessor: (r: PostRow) => <span className="font-semibold text-ink">{r.title || "(no title)"}</span>, className: "max-w-md" },
                        { header: "Category", accessor: (r: PostRow) => CATEGORY_LABEL[r.category as keyof typeof CATEGORY_LABEL] ?? r.category },
                        { header: "Author", accessor: "author" },
                        {
                            header: "Status",
                            accessor: (r: PostRow) =>
                                r.scheduledAt ? (
                                    <span className="text-xs text-amber-600 font-semibold">Scheduled {new Date(r.scheduledAt).toLocaleString()}</span>
                                ) : (
                                    <StatusBadge status={r.status} />
                                ),
                        },
                        {
                            header: "Date",
                            accessor: (r: PostRow) =>
                                r.publishedAt ? new Date(r.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—",
                        },
                    ]}
                    title="Posts"
                    searchable
                    server={{
                        page,
                        pageSize: PAGE_SIZE,
                        totalCount,
                        onPageChange: setPage,
                        onSearchChange: (q) => { setSearch(q); setPage(1); },
                    }}
                    actions={(r: PostRow) => (
                        <TableActions>
                            {canApprove && r.status === "IN_REVIEW" && (
                                <>
                                    <ActionButton onClick={() => setPostStatus(r.id, "APPROVED")}>Approve</ActionButton>
                                    <ActionButton onClick={() => setPostStatus(r.id, "DRAFT")}>Send back</ActionButton>
                                </>
                            )}
                            {canApprove && r.status === "APPROVED" && (
                                <ActionButton onClick={() => setPostStatus(r.id, "PUBLISHED")}>Publish</ActionButton>
                            )}
                            {r.status === "PUBLISHED" && r.slug && (
                                <a href={`/blog/${r.slug}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline transition-colors">
                                    View
                                </a>
                            )}
                            <ActionButton onClick={() => router.push(`/admin/blog/${r.id}`)}>Edit</ActionButton>
                            <ActionButton tone="danger" onClick={() => remove(r)}>
                                {r.status === "ARCHIVED" || r.status === "DRAFT" ? "Delete" : "Archive"}
                            </ActionButton>
                        </TableActions>
                    )}
                />
            )}
        </div>
    );
}
