"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    LuPenLine, LuPlus, LuEye, LuTrash2, LuCalendar,
    LuFileText, LuCheck, LuClock, LuSearch,
} from "react-icons/lu";
import { useToast } from "@/components/admin/Toast";
import { useConfirmDialog, StatusBadge, EmptyState } from "@/components/admin/ui";
import { CATEGORY_LABEL } from "@/lib/content";

type Post = {
    id: string;
    title: string;
    slug: string;
    status: string;
    category: string;
    author: string;
    imageUrl: string | null;
    excerpt: string | null;
    viewCount: number;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

const TABS = [
    { key: "", label: "All" },
    { key: "PUBLISHED", label: "Published" },
    { key: "IN_REVIEW", label: "In Review" },
    { key: "DRAFT", label: "Drafts" },
];

export default function TeacherBlogPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const { confirm, dialog } = useConfirmDialog();

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [teacherName, setTeacherName] = useState("");

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (status) params.set("status", status);
            if (search) params.set("q", search);

            const res = await fetch(`/api/teacher/blog?${params}`);
            if (res.ok) {
                const data = await res.json();
                setPosts(data.posts || []);
                setCounts(data.counts || {});
                if (data.teacherName) setTeacherName(data.teacherName);
            }
        } catch {
            showToast("error", "Failed to load your articles");
        } finally {
            setLoading(false);
        }
    }, [status, search, showToast]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleDelete = async (post: Post) => {
        const isDraft = post.status === "DRAFT";
        const ok = await confirm({
            title: isDraft ? "Delete this draft?" : "Archive this article?",
            message: isDraft
                ? "This draft will be permanently removed."
                : "Archived articles will no longer appear publicly on the blog.",
            confirmLabel: isDraft ? "Delete" : "Archive",
            tone: "danger",
        });

        if (!ok) return;

        try {
            const res = await fetch(`/api/teacher/blog?id=${post.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Action failed");
            showToast("success", isDraft ? "Draft deleted" : "Article archived");
            fetchPosts();
        } catch {
            showToast("error", "Could not delete article");
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-20">
            {dialog}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-200/80 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">
                        My Articles & Blog
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Articles you have written and published under your name on The Shakti Journal
                    </p>
                </div>

                <Link
                    href="/teacher/blog/new"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                    <LuPlus className="w-4 h-4" />
                    <span>Write New Article</span>
                </Link>
            </div>

            {/* Status Tabs and Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                    {TABS.map((t) => {
                        const count =
                            t.key === ""
                                ? counts.all ?? 0
                                : t.key === "PUBLISHED"
                                ? counts.published ?? 0
                                : t.key === "IN_REVIEW"
                                ? counts.inReview ?? 0
                                : counts.draft ?? 0;
                        const active = status === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setStatus(t.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                                    active ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                <span>{t.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${active ? "bg-gray-100 text-gray-700" : "bg-gray-200/60 text-gray-500"}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="relative w-full sm:w-64">
                    <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search your articles..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs sm:text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
            </div>

            {/* Content List */}
            {loading ? (
                <div className="py-20 text-center">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">Loading your articles...</p>
                </div>
            ) : posts.length === 0 ? (
                <EmptyState
                    icon={LuFileText}
                    title={search || status ? "No matching articles found" : "You haven't written any articles yet"}
                    hint={
                        search || status
                            ? "Try clearing your search or status filter."
                            : "Share your knowledge and guidance with students and the global community."
                    }
                    action={
                        <Link
                            href="/teacher/blog/new"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all"
                        >
                            <LuPlus className="w-4 h-4" />
                            <span>Write Your First Article</span>
                        </Link>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {posts.map((post) => (
                        <div
                            key={post.id}
                            className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
                        >
                            <div className="flex items-start gap-4 min-w-0">
                                <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden shrink-0 relative border border-gray-100">
                                    {post.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-serif text-2xl bg-primary/5 text-primary">
                                            {post.title.charAt(0)}
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary">
                                            {CATEGORY_LABEL[post.category as keyof typeof CATEGORY_LABEL] ?? post.category}
                                        </span>
                                        <StatusBadge status={post.status} />
                                    </div>

                                    <h3 className="text-base sm:text-lg font-serif font-bold text-gray-900 truncate">
                                        {post.title}
                                    </h3>

                                    {post.excerpt && (
                                        <p className="text-xs sm:text-sm text-gray-500 line-clamp-1 mt-0.5">
                                            {post.excerpt}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                                        <span>Author: <strong className="text-gray-700">{post.author}</strong></span>
                                        <span>•</span>
                                        <span>
                                            {post.publishedAt
                                                ? `Published ${new Date(post.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                                                : `Created ${new Date(post.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                {post.status === "PUBLISHED" && post.slug && (
                                    <a
                                        href={`/blog/${post.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <LuEye className="w-3.5 h-3.5" />
                                        <span>View</span>
                                    </a>
                                )}

                                <Link
                                    href={`/teacher/blog/${post.id}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                                >
                                    <LuPenLine className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => handleDelete(post)}
                                    className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title={post.status === "DRAFT" ? "Delete draft" : "Archive article"}
                                >
                                    <LuTrash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
