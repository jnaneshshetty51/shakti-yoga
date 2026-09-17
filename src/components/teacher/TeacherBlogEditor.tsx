"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    LuArrowLeft, LuBold, LuItalic, LuHeading2, LuHeading3,
    LuList, LuListOrdered, LuQuote, LuCode, LuLink, LuImage,
    LuEye, LuPenLine, LuColumns2, LuCheck, LuUpload, LuClock,
    LuUser, LuSparkles, LuTrash2,
} from "react-icons/lu";
import { useToast } from "@/components/admin/Toast";
import { CATEGORY_LABEL, readMinutes } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";

const CATEGORIES = Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }));

interface TeacherBlogEditorProps {
    mode: "create" | "edit";
    postId?: string;
}

export default function TeacherBlogEditor({ mode, postId }: TeacherBlogEditorProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [loading, setLoading] = useState(mode === "edit");
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("edit");
    const [uploadingImage, setUploadingImage] = useState(false);

    const [form, setForm] = useState({
        title: "",
        slug: "",
        author: "",
        category: "YOGA",
        excerpt: "",
        body: "",
        imageUrl: "",
        tags: "",
        status: "PUBLISHED",
    });

    // Fetch initial post data if editing
    useEffect(() => {
        if (mode === "edit" && postId) {
            fetch(`/api/teacher/blog/${postId}`)
                .then((res) => {
                    if (!res.ok) throw new Error("Could not load post");
                    return res.json();
                })
                .then((data) => {
                    const p = data.post;
                    setForm({
                        title: p.title || "",
                        slug: p.slug || "",
                        author: p.author || data.teacherName || "",
                        category: p.category || "YOGA",
                        excerpt: p.excerpt || "",
                        body: p.body || "",
                        imageUrl: p.imageUrl || "",
                        tags: Array.isArray(p.tags) ? p.tags.join(", ") : "",
                        status: p.status || "PUBLISHED",
                    });
                })
                .catch((err) => {
                    showToast("error", err.message || "Failed to load article");
                    router.push("/teacher/blog");
                })
                .finally(() => setLoading(false));
        } else if (mode === "create") {
            // Preload teacher's name
            fetch("/api/teacher/blog?pageSize=1")
                .then((res) => res.json())
                .then((data) => {
                    if (data.teacherName) {
                        setForm((prev) => ({ ...prev, author: data.teacherName }));
                    }
                })
                .catch(() => {});
        }
    }, [mode, postId, router, showToast]);

    const handleTitleChange = (val: string) => {
        setForm((prev) => {
            const next = { ...prev, title: val };
            // Auto generate slug on create if not manually edited
            if (mode === "create" && (!prev.slug || prev.slug === slugify(prev.title))) {
                next.slug = slugify(val);
            }
            return next;
        });
    };

    function slugify(text: string) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    // Markdown insertion helper
    const insertFormat = (prefix: string, suffix: string = "") => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);
        const replacement = `${prefix}${selected || "text"}${suffix}`;

        const nextBody = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
        setForm((prev) => ({ ...prev, body: nextBody }));

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 4));
        }, 10);
    };

    // Image upload handler
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        const data = new FormData();
        data.append("file", file);

        try {
            const res = await fetch("/api/teacher/blog/image", {
                method: "POST",
                body: data,
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Image upload failed");

            setForm((prev) => ({ ...prev, imageUrl: result.url }));
            showToast("success", "Cover image uploaded successfully!");
        } catch (err: any) {
            showToast("error", err.message || "Failed to upload image");
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSave = async (targetStatus?: "DRAFT" | "IN_REVIEW" | "PUBLISHED") => {
        if (!form.title.trim()) {
            showToast("error", "Please provide an article title");
            return;
        }

        setSaving(true);
        const effectiveStatus = targetStatus || form.status;

        try {
            const payload = {
                ...(mode === "edit" ? { id: postId } : {}),
                title: form.title.trim(),
                slug: form.slug.trim(),
                author: form.author.trim(),
                category: form.category,
                excerpt: form.excerpt.trim(),
                body: form.body,
                imageUrl: form.imageUrl,
                tags: form.tags,
                status: effectiveStatus,
            };

            const res = await fetch("/api/teacher/blog", {
                method: mode === "edit" ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Save failed");

            showToast(
                "success",
                effectiveStatus === "PUBLISHED"
                    ? "Article published successfully under your name!"
                    : effectiveStatus === "IN_REVIEW"
                    ? "Article submitted for review!"
                    : "Draft saved!"
            );

            router.push("/teacher/blog");
        } catch (err: any) {
            showToast("error", err.message || "Failed to save article");
        } finally {
            setSaving(false);
        }
    };

    const wordCount = form.body.trim().split(/\s+/).filter(Boolean).length;
    const minutes = readMinutes(form.body);

    if (loading) {
        return (
            <div className="py-20 text-center">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">Loading article...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-24">
            {/* Top Navigation & Actions Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-200/80 mb-8">
                <div className="flex items-center gap-3">
                    <Link
                        href="/teacher/blog"
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        title="Back to articles"
                    >
                        <LuArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-serif font-bold text-gray-900">
                            {mode === "create" ? "Write New Article" : "Edit Article"}
                        </h1>
                        <p className="text-xs text-gray-500">
                            Share your yoga insights and teachings on The Shakti Journal
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSave("DRAFT")}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        Save Draft
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSave("IN_REVIEW")}
                        className="px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 text-xs sm:text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                    >
                        Submit for Review
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSave("PUBLISHED")}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-white text-xs sm:text-sm font-semibold shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all"
                    >
                        <LuCheck className="w-4 h-4" />
                        <span>{saving ? "Publishing..." : "Publish Article"}</span>
                    </button>
                </div>
            </div>

            {/* Author Attribution Banner */}
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-secondary/10 via-primary/5 to-transparent border border-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/20 text-secondary flex items-center justify-center font-bold">
                        <LuUser className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wider font-bold text-secondary">Author Attribution</div>
                        <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <span>Publishing under:</span>
                            <span className="text-primary font-bold">{form.author || "Your Trainer Profile"}</span>
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">Trainer</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 whitespace-nowrap">Byline Name:</label>
                    <input
                        type="text"
                        value={form.author}
                        onChange={(e) => setForm({ ...form, author: e.target.value })}
                        placeholder="Your display name"
                        className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 w-48"
                    />
                </div>
            </div>

            {/* Main Editor Form */}
            <div className="space-y-6">
                {/* Title */}
                <div>
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Article Title..."
                        className="w-full text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-gray-900 placeholder:text-gray-300 border-0 border-b border-gray-200/80 pb-3 focus:outline-none focus:border-primary transition-colors bg-transparent"
                    />
                </div>

                {/* Metadata row: Category, Slug, Tags */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
                        <select
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">URL Slug</label>
                        <input
                            type="text"
                            value={form.slug}
                            onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                            placeholder="article-url-slug"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white text-gray-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tags (comma separated)</label>
                        <input
                            type="text"
                            value={form.tags}
                            onChange={(e) => setForm({ ...form, tags: e.target.value })}
                            placeholder="pranayama, posture, morning"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                {/* Cover Image */}
                <div className="pt-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Featured Cover Image</label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {form.imageUrl ? (
                            <div className="relative w-40 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={form.imageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, imageUrl: "" })}
                                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600 transition-all"
                                    title="Remove image"
                                >
                                    <LuTrash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : null}

                        <div className="flex-1 flex flex-wrap items-center gap-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <button
                                type="button"
                                disabled={uploadingImage}
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <LuUpload className="w-3.5 h-3.5" />
                                <span>{uploadingImage ? "Uploading..." : "Upload Cover Image"}</span>
                            </button>
                            <span className="text-xs text-gray-400">or paste URL:</span>
                            <input
                                type="text"
                                value={form.imageUrl}
                                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                                placeholder="https://... or /api/media/..."
                                className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>
                </div>

                {/* Excerpt */}
                <div className="pt-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Excerpt / Summary (shown on blog index & search)
                    </label>
                    <textarea
                        rows={2}
                        value={form.excerpt}
                        onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                        placeholder="A short summary of what readers will learn in this article..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                {/* Article Body Section with Toolbar */}
                <div className="pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-200 mb-2">
                        <div className="flex flex-wrap items-center gap-1">
                            <button
                                type="button"
                                onClick={() => insertFormat("**", "**")}
                                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                title="Bold"
                            >
                                <LuBold className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => insertFormat("*", "*")}
                                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                title="Italic"
                            >
                                <LuItalic className="w-4 h-4" />
                            </button>
                            <span className="w-px h-4 bg-gray-200 mx-1" />
                            <button
                                type="button"
                                onClick={() => insertFormat("\n## ", "\n")}
                                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-bold text-xs"
                                title="Heading 2"
                            >
                                <LuHeading2 className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => insertFormat("\n### ", "\n")}
                                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-bold text-xs"
                                title="Heading 3"
                            >
                                <LuHeading3 className="w-4 h-4" />
                            </button>
                            <span className="w-px h-4 bg-gray-200 mx-1" />
                            <button
                                type="button"
                                onClick={() => insertFormat("\n- ", "")}
                                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                title="Bullet List"
                            >
                                <LuList className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => insertFormat("\n1. ", "")}
                                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                title="Numbered List"
                            >
                                <LuListOrdered className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => insertFormat("\n> ", "\n")}
                                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                title="Quote"
                            >
                                <LuQuote className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => insertFormat("[", "](https://)")}
                                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                title="Link"
                            >
                                <LuLink className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => insertFormat("![alt text](", ")")}
                                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                title="Image"
                            >
                                <LuImage className="w-4 h-4" />
                            </button>
                        </div>

                        {/* View mode toggle */}
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setViewMode("edit")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                    viewMode === "edit" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                Write
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("split")}
                                className={`hidden md:block px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                    viewMode === "split" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                Split
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("preview")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                    viewMode === "preview" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                Preview
                            </button>
                        </div>
                    </div>

                    {/* Editor / Preview Area */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(viewMode === "edit" || viewMode === "split") && (
                            <div className={viewMode === "edit" ? "md:col-span-2" : ""}>
                                <textarea
                                    ref={textareaRef}
                                    rows={18}
                                    value={form.body}
                                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                                    placeholder="Write your article in Markdown here... Use ## for headings, **bold**, *italics*, bullet points, etc."
                                    className="w-full p-4 rounded-2xl border border-gray-200 bg-white text-gray-900 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                                />
                            </div>
                        )}

                        {(viewMode === "preview" || viewMode === "split") && (
                            <div className={`p-6 rounded-2xl border border-gray-200 bg-white overflow-y-auto max-h-[500px] ${viewMode === "preview" ? "md:col-span-2" : ""}`}>
                                <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Live Preview</div>
                                <div
                                    className="prose prose-sm sm:prose max-w-none prose-headings:font-serif prose-headings:text-primary prose-a:text-secondary"
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(form.body || "*No content to preview yet...*") }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Stats bar */}
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-2 px-1">
                        <div className="flex items-center gap-3">
                            <span>{wordCount} words</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <LuClock className="w-3.5 h-3.5" />
                                {minutes} min read
                            </span>
                        </div>
                        <div>Markdown formatted</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
