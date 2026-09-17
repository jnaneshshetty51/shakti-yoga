"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    LuArrowLeft, LuBold, LuItalic, LuStrikethrough, LuHeading1, LuHeading2, LuHeading3,
    LuList, LuListOrdered, LuSquareCheck, LuQuote, LuCode, LuLink, LuImage, LuMinus,
    LuTable, LuEye, LuPenLine, LuColumns2, LuSettings, LuCheck, LuCopy, LuExternalLink,
    LuCalendar, LuUpload, LuTrash2, LuSparkles, LuCircleHelp, LuClock, LuFileText,
    LuX, LuChevronDown, LuChevronRight, LuGlobe, LuLock, LuShieldCheck,
} from "react-icons/lu";
import { Button, Badge, labelClass, inputClass } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import { CATEGORY_LABEL, ACCESS_LABEL, readMinutes } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { resolveContentCta } from "@/lib/content-cta";

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ label, value }));
const ACCESS_OPTIONS = Object.entries(ACCESS_LABEL).map(([value, label]) => ({ label, value }));
const CTA_OPTIONS = [
    { label: "None", value: "none" },
    { label: "Join next class", value: "join_next_class" },
    { label: "View classes", value: "view_classes" },
    { label: "Book therapy", value: "book_therapy" },
    { label: "Open related content", value: "open_content" },
    { label: "Open related practice", value: "open_practice" },
];
const STATUS_LABEL: Record<string, string> = {
    DRAFT: "Draft",
    IN_REVIEW: "In review",
    APPROVED: "Approved",
    PUBLISHED: "Published",
    ARCHIVED: "Archived",
};

function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toLocalInput(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(+d)) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface PostFields {
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    imageUrl: string;
    category: string;
    tags: string;
    author: string;
    language: string;
    ctaType: string;
    ctaLabel: string;
    relatedContentId: string;
    relatedClassBatchId: string;
    mediaUrls: string;
    metaTitle: string;
    metaDescription: string;
    access: string;
    audience: string;
    featured: boolean;
    pinned: boolean;
    notifyOnPublish: boolean;
    status: string;
    scheduledAt: string;
    reviewNote: string;
    publishedAt: string | null;
}

const BLANK: PostFields = {
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    imageUrl: "",
    category: "YOGA",
    tags: "",
    author: "Shakti Yoga",
    language: "English",
    ctaType: "none",
    ctaLabel: "",
    relatedContentId: "",
    relatedClassBatchId: "",
    mediaUrls: "",
    metaTitle: "",
    metaDescription: "",
    access: "PUBLIC",
    audience: "",
    featured: false,
    pinned: false,
    notifyOnPublish: false,
    status: "DRAFT",
    scheduledAt: "",
    reviewNote: "",
    publishedAt: null,
};

export default function BlogEditor({ mode, id }: { mode: "create" | "edit"; id?: string }) {
    const router = useRouter();
    const { showToast } = useToast();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const inlineImageInputRef = useRef<HTMLInputElement>(null);
    const coverImageInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(mode === "edit");
    const [fields, setFields] = useState<PostFields>(BLANK);
    const [isDirty, setIsDirty] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Editor View Modes: "write" (distraction-free), "split" (side-by-side), "preview" (full article preview)
    const [viewMode, setViewMode] = useState<"write" | "split" | "preview">("split");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeSidebarTab, setActiveSidebarTab] = useState<"publish" | "cover" | "seo" | "taxonomies" | "cta">("publish");

    const [slugEditing, setSlugEditing] = useState(false);
    const [slugDraft, setSlugDraft] = useState("");
    const [saving, setSaving] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingInline, setUploadingInline] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [canApprove, setCanApprove] = useState(false);
    const [contentOptions, setContentOptions] = useState<{ label: string; value: string }[]>([]);
    const [classBatchOptions, setClassBatchOptions] = useState<{ label: string; value: string }[]>([]);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [linkText, setLinkText] = useState("");

    const set = <K extends keyof PostFields>(key: K, value: PostFields[K]) => {
        setFields((f) => ({ ...f, [key]: value }));
        setIsDirty(true);
    };

    const loadPost = useCallback(async () => {
        if (mode !== "edit" || !id) return;
        const res = await fetch(`/api/admin/content/${id}`);
        if (!res.ok) {
            setError("Could not load this post.");
            return;
        }
        const data = await res.json();
        const r = data.content;
        setFields({
            title: r.title || "",
            slug: r.slug || "",
            excerpt: r.excerpt || "",
            body: r.body || "",
            imageUrl: r.imageUrl || "",
            category: r.category || "YOGA",
            tags: r.tags || "",
            author: r.author || "Shakti Yoga",
            language: r.language || "English",
            ctaType: r.ctaType || "none",
            ctaLabel: r.ctaLabel || "",
            relatedContentId: r.relatedContentId || "",
            relatedClassBatchId: r.relatedClassBatchId || "",
            mediaUrls: r.mediaUrls || "",
            metaTitle: r.metaTitle || "",
            metaDescription: r.metaDescription || "",
            access: r.access || "PUBLIC",
            audience: r.audience || "",
            featured: !!r.featured,
            pinned: !!r.pinned,
            notifyOnPublish: !!r.notifyOnPublish,
            status: r.status || "DRAFT",
            scheduledAt: r.scheduledAt ? toLocalInput(r.scheduledAt) : "",
            reviewNote: r.reviewNote || "",
            publishedAt: r.publishedAt || null,
        });
        setIsDirty(false);
    }, [mode, id]);

    const loadOptions = useCallback(async () => {
        const res = await fetch("/api/admin/content?pageSize=1");
        if (!res.ok) return;
        const data = await res.json();
        setCanApprove(!!data.canApprove);
        setContentOptions((data.contentOptions || []).filter((o: { value: string }) => o.value !== id));
        setClassBatchOptions(data.classBatchOptions || []);
    }, [id]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await Promise.all([loadPost(), loadOptions()]);
            setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const save = async (statusOverride?: string) => {
        const nextStatus = statusOverride ?? fields.status;
        setSaving(nextStatus);
        setError(null);
        try {
            const effectiveSlug = fields.slug || slugify(fields.title);
            const payload: Record<string, unknown> = {
                ...fields,
                slug: effectiveSlug,
                contentType: "ARTICLE",
                status: nextStatus,
            };
            if (mode === "edit") payload.id = id;

            const res = await fetch("/api/admin/content?type=content", {
                method: mode === "edit" ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Save failed");

            set("status", nextStatus);
            setIsDirty(false);
            setLastSaved(new Date());
            showToast(
                "success",
                nextStatus === "PUBLISHED" ? "Article published live!" : nextStatus === "IN_REVIEW" ? "Submitted for review." : "Draft saved.",
            );
            if (mode === "create" && data.id) {
                router.replace(`/admin/blog/${data.id}`);
            } else {
                await loadPost();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Save failed";
            setError(message);
            showToast("error", message);
        } finally {
            setSaving(null);
        }
    };

    // Keyboard Shortcuts (Cmd+S to save draft, Cmd+B bold, Cmd+I italic, Cmd+K link)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                save(fields.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT");
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
                if (document.activeElement === textareaRef.current) {
                    e.preventDefault();
                    wrapSelection("**", "**", "bold text");
                }
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
                if (document.activeElement === textareaRef.current) {
                    e.preventDefault();
                    wrapSelection("*", "*", "italic text");
                }
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                if (document.activeElement === textareaRef.current) {
                    e.preventDefault();
                    openLinkModal();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    // Formatting Toolbar Helpers
    const wrapSelection = (before: string, after: string = before, placeholder = "text") => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const val = el.value;
        const selected = val.slice(start, end) || placeholder;
        const replacement = `${before}${selected}${after}`;
        const next = val.slice(0, start) + replacement + val.slice(end);
        set("body", next);
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + before.length, start + before.length + selected.length);
        }, 10);
    };

    const prefixLines = (prefix: string) => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const val = el.value;
        const lineStart = val.lastIndexOf("\n", start - 1) + 1;
        const lineEnd = val.indexOf("\n", end);
        const actualEnd = lineEnd === -1 ? val.length : lineEnd;
        const selectedBlock = val.slice(lineStart, actualEnd);
        const modified = selectedBlock
            .split("\n")
            .map((line) => (line.startsWith(prefix) ? line.slice(prefix.length) : `${prefix}${line}`))
            .join("\n");
        const next = val.slice(0, lineStart) + modified + val.slice(actualEnd);
        set("body", next);
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(lineStart, lineStart + modified.length);
        }, 10);
    };

    const insertTextAtCursor = (text: string) => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const val = el.value;
        const next = val.slice(0, start) + text + val.slice(end);
        set("body", next);
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + text.length, start + text.length);
        }, 10);
    };

    const openLinkModal = () => {
        const el = textareaRef.current;
        const sel = el ? el.value.slice(el.selectionStart, el.selectionEnd) : "";
        setLinkText(sel || "Link description");
        setLinkUrl("");
        setLinkModalOpen(true);
    };

    const applyLink = () => {
        if (!linkUrl) {
            setLinkModalOpen(false);
            return;
        }
        insertTextAtCursor(`[${linkText || "link"}](${linkUrl})`);
        setLinkModalOpen(false);
    };

    // Image Uploading
    const uploadImageFile = async (file: File, kind: "cover" | "inline") => {
        const isCover = kind === "cover";
        if (isCover) setUploadingImage(true);
        else setUploadingInline(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append("kind", "blog");
            fd.append("file", file);
            const res = await fetch("/api/admin/content/image", { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");
            if (isCover) {
                set("imageUrl", data.url as string);
                showToast("success", "Cover image uploaded.");
            } else {
                insertTextAtCursor(`\n\n![${file.name.replace(/\.[^.]+$/, "")}](${data.url})\n\n`);
                showToast("success", "Image inserted into article.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
            showToast("error", "Image upload failed");
        } finally {
            if (isCover) setUploadingImage(false);
            else setUploadingInline(false);
        }
    };

    // Paste & Drag-and-drop Image Handler
    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    uploadImageFile(file, "inline");
                    break;
                }
            }
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0 && files[0].type.startsWith("image/")) {
            e.preventDefault();
            uploadImageFile(files[0], "inline");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-medium text-ink-muted">Loading article studio…</p>
                </div>
            </div>
        );
    }

    const effectiveSlug = fields.slug || slugify(fields.title);
    const wordsCount = (fields.body || "").trim().split(/\s+/).filter(Boolean).length;
    const estMinutes = readMinutes(fields.body || "");
    const resolvedCta = resolveContentCta(fields.ctaType, fields.ctaLabel, fields.relatedContentId);

    const primaryAction =
        fields.status === "PUBLISHED"
            ? { label: "Update Live", status: "PUBLISHED" }
            : canApprove
              ? { label: "Publish", status: "PUBLISHED" }
              : { label: "Submit for Review", status: "IN_REVIEW" };

    return (
        <div className="min-h-screen -mx-4 -mt-6 sm:-mx-8 sm:-mt-8 flex flex-col bg-surface">
            {/* ---------------------------------------------------- TOP STUDIO NAVIGATION BAR */}
            <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-hairline px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-xs">
                {/* Left: Back & Document Status */}
                <div className="flex items-center gap-3 min-w-0">
                    <Link
                        href="/admin/blog"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-ink-subtle hover:text-ink px-2.5 py-1.5 rounded-full hover:bg-surface-sunken transition-colors shrink-0"
                    >
                        <LuArrowLeft /> All Posts
                    </Link>
                    <div className="h-4 w-px bg-hairline hidden sm:block" />
                    <Badge
                        tone={
                            fields.status === "PUBLISHED"
                                ? "green"
                                : fields.status === "APPROVED"
                                  ? "blue"
                                  : fields.status === "IN_REVIEW"
                                    ? "amber"
                                    : "gray"
                        }
                    >
                        {STATUS_LABEL[fields.status] ?? fields.status}
                    </Badge>
                    <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-ink-subtle">
                        <LuClock className="text-xs" />
                        <span>{wordsCount} words</span>
                        <span>·</span>
                        <span>{estMinutes} min read</span>
                    </span>
                    {isDirty && (
                        <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 hidden lg:inline">
                            ● Unsaved changes
                        </span>
                    )}
                    {!isDirty && lastSaved && (
                        <span className="text-[11px] text-ink-subtle hidden lg:inline">
                            Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                    )}
                </div>

                {/* Center: View Mode Switcher */}
                <div className="flex items-center bg-surface-sunken p-0.5 rounded-full border border-hairline text-xs font-medium shrink-0">
                    <button
                        type="button"
                        onClick={() => setViewMode("write")}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
                            viewMode === "write" ? "bg-white text-ink shadow-xs font-semibold" : "text-ink-muted hover:text-ink"
                        }`}
                        title="Distraction-free Writing Canvas"
                    >
                        <LuPenLine />
                        <span className="hidden sm:inline">Write</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("split")}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
                            viewMode === "split" ? "bg-white text-ink shadow-xs font-semibold" : "text-ink-muted hover:text-ink"
                        }`}
                        title="Side-by-side Editor & Live Preview"
                    >
                        <LuColumns2 />
                        <span className="hidden sm:inline">Split</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("preview")}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
                            viewMode === "preview" ? "bg-white text-ink shadow-xs font-semibold" : "text-ink-muted hover:text-ink"
                        }`}
                        title="Full Public Article Preview"
                    >
                        <LuEye />
                        <span className="hidden sm:inline">Preview</span>
                    </button>
                </div>

                {/* Right: Actions & Inspector Toggle */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowHelpModal(true)}
                        className="p-1.5 text-ink-subtle hover:text-ink rounded-full hover:bg-surface-sunken transition-colors text-sm"
                        title="Markdown Cheatsheet"
                    >
                        <LuCircleHelp />
                    </button>
                    {fields.status === "PUBLISHED" && effectiveSlug && (
                        <a
                            href={`/blog/${effectiveSlug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-strong px-2.5 py-1.5 rounded-full hover:bg-primary/5 transition-colors"
                        >
                            View Live <LuExternalLink />
                        </a>
                    )}
                    <Button
                        variant="secondary"
                        onClick={() => save("DRAFT")}
                        loading={saving === "DRAFT"}
                        className="text-xs px-3 py-1.5"
                    >
                        Save Draft
                    </Button>
                    <Button
                        onClick={() => save(primaryAction.status)}
                        loading={saving === primaryAction.status}
                        className="text-xs px-3.5 py-1.5 font-semibold"
                    >
                        {primaryAction.label}
                    </Button>
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className={`p-1.5 rounded-control border transition-all text-sm ${
                            sidebarOpen
                                ? "bg-primary text-white border-primary"
                                : "bg-surface text-ink-muted border-hairline hover:text-ink"
                        }`}
                        title="Toggle Post Settings"
                    >
                        <LuSettings />
                    </button>
                </div>
            </header>

            {error && (
                <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-control text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                        <LuX />
                    </button>
                </div>
            )}

            {/* ---------------------------------------------------- MAIN BODY WORKSPACE */}
            <div className="flex-1 flex overflow-hidden">
                {/* ----------------- Editor / Split / Preview Viewport */}
                <div className="flex-1 overflow-y-auto flex flex-col">
                    {/* FORMATTING TOOLBAR (shown in Write & Split views) */}
                    {viewMode !== "preview" && (
                        <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-hairline px-4 sm:px-8 py-2 flex flex-wrap items-center gap-1 shadow-2xs">
                            {/* Headings */}
                            <div className="flex items-center gap-0.5 border-r border-hairline pr-1.5 mr-1">
                                <button
                                    type="button"
                                    onClick={() => prefixLines("# ")}
                                    className="p-1.5 rounded hover:bg-surface-sunken text-ink-muted hover:text-ink text-sm font-semibold"
                                    title="Heading 1 (#)"
                                >
                                    <LuHeading1 />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => prefixLines("## ")}
                                    className="p-1.5 rounded hover:bg-surface-sunken text-ink-muted hover:text-ink text-sm font-semibold"
                                    title="Heading 2 (##)"
                                >
                                    <LuHeading2 />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => prefixLines("### ")}
                                    className="p-1.5 rounded hover:bg-surface-sunken text-ink-muted hover:text-ink text-sm font-semibold"
                                    title="Heading 3 (###)"
                                >
                                    <LuHeading3 />
                                </button>
                            </div>

                            {/* Inline styles */}
                            <div className="flex items-center gap-0.5 border-r border-hairline pr-1.5 mr-1">
                                <button
                                    type="button"
                                    onClick={() => wrapSelection("**", "**", "bold text")}
                                    className="p-1.5 rounded hover:bg-surface-sunken text-ink-muted hover:text-ink text-sm"
                                    title="Bold (Cmd+B)"
                                >
                                    <LuBold />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => wrapSelection("*", "*", "italic text")}
                                    className="p-1.5 rounded hover:bg-surface-sunken text-ink-muted hover:text-ink text-sm"
                                    title="Italic (Cmd+I)"
                                >
                                    <LuItalic />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => wrapSelection("~~", "~~", "strikethrough")}
                                    className="p-1.5 rounded hover:bg-surface-sunken text-ink-muted hover:text-ink text-sm"
                                    title="Strikethrough (~~)"
                                >
                                    <LuStrikethrough />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => wrapSelection("`", "`", "code")}
                                    className="p-1.5 rounded hover:bg-surface-sunken text-ink-muted hover:text-ink text-sm"
                                    title="Inline Code (`)"
                                >
                                    <LuCode />
                                </button>
                            </div>

                            {/* Lists & Quotes */}
                            <div className="flex items-center gap-0.5 border-r border-hairline pr-1.5 mr-1">
                                <button
                                    type="button"
                                    onClick={() => prefixLines("- ")}
                                    className="p-1.5 rounded hover:bg-surface-sunken text-ink-muted hover:text-ink text-sm"
                                    title="Bullet List (-)"
                                >
                                    <LuList />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => prefixLines("1. ")}
                                    className="p-1.5 rounded hover:bg-surface-sunken text-ink-muted hover:text-ink text-sm"
                                    title="Numbered List (1.)"
                                >
                                    <LuListOrdered />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => prefixLines("- [ ] ")}
                                    className="p-1.5 rounded hover:bg-surface-sunken text-ink-muted hover:text-ink text-sm"
                                    title="Task Checklist (- [ ])"
                                >
                                    <LuSquareCheck />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => prefixLines("> ")}
                                    className="p-1.5 rounded hover:bg-surface-sunken text-ink-muted hover:text-ink text-sm"
                                    title="Blockquote (>)"
                                >
                                    <LuQuote />
                                </button>
                            </div>

                            {/* Inserts: Links, Media, Tables, Callouts */}
                            <div className="flex items-center gap-0.5">
                                <button
                                    type="button"
                                    onClick={openLinkModal}
                                    className="p-1.5 rounded hover:bg-surface-sunken text-ink-muted hover:text-ink text-sm"
                                    title="Insert Link (Cmd+K)"
                                >
                                    <LuLink />
                                </button>
                                <button
                                    type="button"
                                    disabled={uploadingInline}
                                    onClick={() => inlineImageInputRef.current?.click()}
                                    className="p-1.5 rounded hover:bg-surface-sunken text-ink-muted hover:text-ink text-sm flex items-center gap-1"
                                    title="Upload & Insert Inline Image"
                                >
                                    <LuImage />
                                    {uploadingInline && <span className="text-[10px] animate-pulse">…</span>}
                                </button>
                                <input
                                    ref={inlineImageInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        e.target.value = "";
                                        if (f) uploadImageFile(f, "inline");
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        insertTextAtCursor(
                                            "\n\n| Concept | Meaning | Practice |\n| :--- | :--- | :--- |\n| Asana | Physical posture | Stability & ease |\n| Pranayama | Breath control | Energy balance |\n\n",
                                        )
                                    }
                                    className="p-1.5 rounded hover:bg-surface-sunken text-ink-muted hover:text-ink text-sm"
                                    title="Insert Markdown Table"
                                >
                                    <LuTable />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => insertTextAtCursor("\n\n---\n\n")}
                                    className="p-1.5 rounded hover:bg-surface-sunken text-ink-muted hover:text-ink text-sm"
                                    title="Insert Horizontal Divider"
                                >
                                    <LuMinus />
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        insertTextAtCursor(
                                            "\n\n> 💡 **Yogic Insight:** \n> The breath is the bridge which connects life to consciousness, which unites your body to your thoughts.\n\n",
                                        )
                                    }
                                    className="px-2 py-1 rounded hover:bg-surface-sunken text-ink-muted hover:text-primary text-xs font-semibold flex items-center gap-1"
                                    title="Insert Callout Card"
                                >
                                    <LuSparkles className="text-secondary" />
                                    <span>Callout</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* WRITING WORKSPACE */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Editor Pane (shown in "write" or "split") */}
                        {(viewMode === "write" || viewMode === "split") && (
                            <div
                                className={`overflow-y-auto px-6 sm:px-12 py-8 transition-all ${
                                    viewMode === "split"
                                        ? "w-1/2 border-r border-hairline bg-surface"
                                        : "max-w-4xl mx-auto w-full bg-surface"
                                }`}
                            >
                                {/* Cover Photo Banner */}
                                {fields.imageUrl ? (
                                    <div className="relative group mb-8 rounded-2xl overflow-hidden aspect-21/9 bg-surface-sunken border border-hairline shadow-xs">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={fields.imageUrl} alt="" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => coverImageInputRef.current?.click()}
                                                className="px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-ink text-xs font-semibold shadow-sm flex items-center gap-1.5"
                                            >
                                                <LuUpload /> Change Cover
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => set("imageUrl", "")}
                                                className="px-3 py-1.5 rounded-full bg-red-600/90 hover:bg-red-600 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                                            >
                                                <LuTrash2 /> Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-6 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => coverImageInputRef.current?.click()}
                                            disabled={uploadingImage}
                                            className="inline-flex items-center gap-1.5 text-xs text-ink-subtle hover:text-ink font-medium px-3 py-1.5 rounded-full hover:bg-surface-sunken border border-dashed border-hairline transition-colors"
                                        >
                                            <LuImage className="text-sm" />
                                            <span>{uploadingImage ? "Uploading Cover…" : "+ Add Cover Image"}</span>
                                        </button>
                                    </div>
                                )}
                                <input
                                    ref={coverImageInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        e.target.value = "";
                                        if (f) uploadImageFile(f, "cover");
                                    }}
                                />

                                {/* Document Title Canvas */}
                                <div className="space-y-3 mb-6">
                                    <input
                                        value={fields.title}
                                        onChange={(e) => set("title", e.target.value)}
                                        placeholder="Article Title…"
                                        className="w-full font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-ink placeholder:text-ink-subtle/30 bg-transparent border-0 outline-none p-0 focus:ring-0 leading-tight"
                                    />

                                    {/* Subtitle / Excerpt */}
                                    <textarea
                                        value={fields.excerpt}
                                        onChange={(e) => set("excerpt", e.target.value)}
                                        placeholder="Write an inviting lead paragraph or excerpt…"
                                        rows={2}
                                        className="w-full text-base sm:text-lg text-ink-muted placeholder:text-ink-subtle/40 bg-transparent border-0 outline-none p-0 focus:ring-0 resize-none leading-relaxed"
                                    />

                                    {/* Permalink Slug Bar */}
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-subtle pt-1 border-t border-hairline/60">
                                        <LuGlobe className="text-xs" />
                                        <span>shaktiyoga.in/blog/</span>
                                        {slugEditing ? (
                                            <>
                                                <input
                                                    autoFocus
                                                    value={slugDraft}
                                                    onChange={(e) => setSlugDraft(slugify(e.target.value))}
                                                    className="border-b border-primary px-1 text-xs bg-transparent outline-none text-ink font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        set("slug", slugDraft);
                                                        setSlugEditing(false);
                                                    }}
                                                    className="font-semibold text-primary hover:underline ml-1"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSlugEditing(false)}
                                                    className="text-ink-subtle hover:text-ink ml-1"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="font-mono text-ink font-medium">{effectiveSlug || "…"}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSlugDraft(effectiveSlug);
                                                        setSlugEditing(true);
                                                    }}
                                                    className="text-primary hover:underline ml-1 font-semibold"
                                                >
                                                    Edit slug
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Markdown Content Canvas */}
                                <textarea
                                    ref={textareaRef}
                                    value={fields.body}
                                    onChange={(e) => set("body", e.target.value)}
                                    onPaste={handlePaste}
                                    onDrop={handleDrop}
                                    placeholder="Begin writing your story or yogic wisdom here… (You can drag and drop or paste images directly into this area, or use the toolbar above)"
                                    rows={28}
                                    className="w-full text-base leading-relaxed text-ink font-serif sm:text-lg bg-transparent border-0 outline-none p-0 focus:ring-0 resize-none min-h-[500px]"
                                />
                            </div>
                        )}

                        {/* Live Rendered Article Preview (shown in "split" or "preview") */}
                        {(viewMode === "split" || viewMode === "preview") && (
                            <div
                                className={`overflow-y-auto px-6 sm:px-12 py-8 bg-surface-subtle transition-all ${
                                    viewMode === "split" ? "w-1/2" : "max-w-4xl mx-auto w-full"
                                }`}
                            >
                                <div className="max-w-3xl mx-auto space-y-8">
                                    {/* Preview Label Pill */}
                                    <div className="flex items-center justify-between text-xs text-ink-subtle border-b border-hairline pb-2">
                                        <span className="font-semibold uppercase tracking-wider text-[10px] text-primary flex items-center gap-1.5">
                                            <LuEye /> Live Public Preview
                                        </span>
                                        <span>Category: {CATEGORY_LABEL[fields.category as keyof typeof CATEGORY_LABEL] ?? fields.category}</span>
                                    </div>

                                    {/* Cover Image in Preview */}
                                    {fields.imageUrl && (
                                        <div className="rounded-2xl overflow-hidden aspect-21/9 bg-surface-sunken shadow-sm">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={fields.imageUrl} alt={fields.title} className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    {/* Title Header */}
                                    <div className="space-y-4">
                                        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink leading-tight">
                                            {fields.title || "Untitled Post"}
                                        </h1>
                                        {fields.excerpt && (
                                            <p className="text-lg text-ink-muted leading-relaxed font-serif italic border-l-2 border-secondary pl-4">
                                                {fields.excerpt}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-subtle pt-2">
                                            <span className="font-semibold text-ink">{fields.author || "Shakti Yoga"}</span>
                                            <span>·</span>
                                            <span>{estMinutes} min read</span>
                                            <span>·</span>
                                            <span>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                        </div>
                                    </div>

                                    {/* Article Body HTML Render */}
                                    <article
                                        className="prose prose-lg max-w-none text-ink font-serif prose-headings:font-serif prose-headings:text-ink prose-a:text-secondary prose-img:rounded-xl prose-blockquote:border-secondary prose-blockquote:bg-surface-sunken/40 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg"
                                        dangerouslySetInnerHTML={{
                                            __html: fields.body
                                                ? renderMarkdown(fields.body)
                                                : "<p class='text-ink-subtle italic font-sans'>Start writing in the editor to see your live preview here…</p>",
                                        }}
                                    />

                                    {/* CTA Box Preview */}
                                    {resolvedCta && (
                                        <div className="my-8 p-6 rounded-2xl bg-secondary/10 border border-secondary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div>
                                                <h3 className="font-serif font-bold text-ink text-lg">{resolvedCta.heading}</h3>
                                                <p className="text-sm text-ink-muted mt-1">Explore authentic guidance and transformative practices.</p>
                                            </div>
                                            <span className="px-5 py-2.5 rounded-full bg-secondary text-white text-sm font-semibold shadow-xs shrink-0 cursor-default">
                                                {resolvedCta.label} →
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ----------------- INSPECTOR / SETTINGS DRAWER */}
                {sidebarOpen && (
                    <aside className="w-80 sm:w-88 border-l border-hairline bg-surface overflow-y-auto flex flex-col shrink-0">
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-hairline flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
                                <LuSettings className="text-primary" /> Post Settings
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(false)}
                                className="p-1 text-ink-subtle hover:text-ink rounded hover:bg-surface-sunken"
                            >
                                <LuX />
                            </button>
                        </div>

                        {/* Sidebar Tab Selector */}
                        <div className="flex border-b border-hairline text-xs font-semibold text-ink-muted">
                            <button
                                type="button"
                                onClick={() => setActiveSidebarTab("publish")}
                                className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                                    activeSidebarTab === "publish" ? "border-primary text-primary" : "border-transparent hover:text-ink"
                                }`}
                            >
                                Status
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSidebarTab("seo")}
                                className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                                    activeSidebarTab === "seo" ? "border-primary text-primary" : "border-transparent hover:text-ink"
                                }`}
                            >
                                SEO
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSidebarTab("taxonomies")}
                                className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                                    activeSidebarTab === "taxonomies" ? "border-primary text-primary" : "border-transparent hover:text-ink"
                                }`}
                            >
                                Taxonomies
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSidebarTab("cta")}
                                className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                                    activeSidebarTab === "cta" ? "border-primary text-primary" : "border-transparent hover:text-ink"
                                }`}
                            >
                                CTA
                            </button>
                        </div>

                        {/* Sidebar Content */}
                        <div className="p-4 space-y-5 flex-1">
                            {/* TAB: PUBLISH & ACCESS */}
                            {activeSidebarTab === "publish" && (
                                <div className="space-y-4 text-xs">
                                    <div>
                                        <label className={labelClass}>Workflow Status</label>
                                        <select
                                            value={fields.status}
                                            onChange={(e) => set("status", e.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="DRAFT">Draft</option>
                                            <option value="IN_REVIEW">In Review</option>
                                            {canApprove && <option value="APPROVED">Approved</option>}
                                            {canApprove && <option value="PUBLISHED">Published</option>}
                                            <option value="ARCHIVED">Archived</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Visibility & Access</label>
                                        <select
                                            value={fields.access}
                                            onChange={(e) => set("access", e.target.value)}
                                            className={inputClass}
                                        >
                                            {ACCESS_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {fields.access === "MEMBERSHIP_REQUIRED" && (
                                        <div>
                                            <label className={labelClass}>Specific Tiers (blank = all members)</label>
                                            <input
                                                value={fields.audience}
                                                onChange={(e) => set("audience", e.target.value)}
                                                placeholder="starter, everyday, family, therapy"
                                                className={inputClass}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className={labelClass}>Schedule Publish</label>
                                        <div className="relative">
                                            <input
                                                type="datetime-local"
                                                value={fields.scheduledAt}
                                                onChange={(e) => set("scheduledAt", e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <p className="text-[11px] text-ink-subtle mt-1">Automatically publishes when date/time arrives.</p>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Internal Review Note</label>
                                        <textarea
                                            value={fields.reviewNote}
                                            onChange={(e) => set("reviewNote", e.target.value)}
                                            rows={3}
                                            placeholder="Optional note for editors or reviewers…"
                                            className={inputClass}
                                        />
                                    </div>

                                    <div className="pt-2 border-t border-hairline space-y-2">
                                        <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={fields.notifyOnPublish}
                                                onChange={(e) => set("notifyOnPublish", e.target.checked)}
                                                className="h-3.5 w-3.5 accent-primary rounded"
                                            />
                                            <span>Send push notification on publish</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* TAB: SEO & GOOGLE PREVIEW */}
                            {activeSidebarTab === "seo" && (
                                <div className="space-y-4 text-xs">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className={labelClass}>SEO Meta Title</label>
                                            <span
                                                className={`text-[10px] ${
                                                    fields.metaTitle.length > 60 ? "text-amber-600 font-semibold" : "text-ink-subtle"
                                                }`}
                                            >
                                                {fields.metaTitle.length}/60 chars
                                            </span>
                                        </div>
                                        <input
                                            value={fields.metaTitle}
                                            onChange={(e) => set("metaTitle", e.target.value)}
                                            placeholder={fields.title || "Custom search title…"}
                                            className={inputClass}
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className={labelClass}>SEO Meta Description</label>
                                            <span
                                                className={`text-[10px] ${
                                                    fields.metaDescription.length > 160 ? "text-amber-600 font-semibold" : "text-ink-subtle"
                                                }`}
                                            >
                                                {fields.metaDescription.length}/160 chars
                                            </span>
                                        </div>
                                        <textarea
                                            value={fields.metaDescription}
                                            onChange={(e) => set("metaDescription", e.target.value)}
                                            rows={3}
                                            placeholder={fields.excerpt || "Teaser shown in Google search results…"}
                                            className={inputClass}
                                        />
                                    </div>

                                    {/* Google SERP Simulator Card */}
                                    <div className="pt-2">
                                        <label className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
                                            Google Search Snippet Preview
                                        </label>
                                        <div className="p-3 bg-surface-sunken border border-hairline rounded-xl space-y-1">
                                            <div className="flex items-center gap-1.5 text-[11px] text-ink-subtle truncate">
                                                <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[9px]">
                                                    SY
                                                </span>
                                                <span className="truncate">shaktiyoga.in › blog › {effectiveSlug || "post"}</span>
                                            </div>
                                            <div className="text-xs font-medium text-blue-700 hover:underline line-clamp-1 leading-snug">
                                                {fields.metaTitle || fields.title || "Article Title — Shakti Yoga"}
                                            </div>
                                            <div className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                                                {fields.metaDescription ||
                                                    fields.excerpt ||
                                                    "Discover holistic yogic wisdom, evidence-based practices, and guidance from master teachers at Shakti Yoga."}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: TAXONOMIES & AUTHOR */}
                            {activeSidebarTab === "taxonomies" && (
                                <div className="space-y-4 text-xs">
                                    <div>
                                        <label className={labelClass}>Category</label>
                                        <select
                                            value={fields.category}
                                            onChange={(e) => set("category", e.target.value)}
                                            className={inputClass}
                                        >
                                            {CATEGORY_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Tags (comma separated)</label>
                                        <input
                                            value={fields.tags}
                                            onChange={(e) => set("tags", e.target.value)}
                                            placeholder="pranayama, vinyasa, spine health"
                                            className={inputClass}
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}>Public Author</label>
                                        <input
                                            value={fields.author}
                                            onChange={(e) => set("author", e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}>Language</label>
                                        <input
                                            value={fields.language}
                                            onChange={(e) => set("language", e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>

                                    <div className="pt-2 border-t border-hairline space-y-2">
                                        <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={fields.featured}
                                                onChange={(e) => set("featured", e.target.checked)}
                                                className="h-3.5 w-3.5 accent-primary rounded"
                                            />
                                            <span>Featured — highlight on homepage</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={fields.pinned}
                                                onChange={(e) => set("pinned", e.target.checked)}
                                                className="h-3.5 w-3.5 accent-primary rounded"
                                            />
                                            <span>Pin to top of blog list</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* TAB: CALL TO ACTION & PAIRING */}
                            {activeSidebarTab === "cta" && (
                                <div className="space-y-4 text-xs">
                                    <div>
                                        <label className={labelClass}>Call to Action Type</label>
                                        <select
                                            value={fields.ctaType}
                                            onChange={(e) => set("ctaType", e.target.value)}
                                            className={inputClass}
                                        >
                                            {CTA_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {fields.ctaType !== "none" && (
                                        <div>
                                            <label className={labelClass}>Custom Button Label (optional)</label>
                                            <input
                                                value={fields.ctaLabel}
                                                onChange={(e) => set("ctaLabel", e.target.value)}
                                                placeholder="e.g. Join Evening Yoga"
                                                className={inputClass}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className={labelClass}>Pairs with Related Content</label>
                                        <select
                                            value={fields.relatedContentId}
                                            onChange={(e) => set("relatedContentId", e.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="">None</option>
                                            {contentOptions.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Pairs with Class Batch</label>
                                        <select
                                            value={fields.relatedClassBatchId}
                                            onChange={(e) => set("relatedClassBatchId", e.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="">None</option>
                                            {classBatchOptions.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>
                )}
            </div>

            {/* ---------------------------------------------------- LINK INSERT MODAL */}
            {linkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
                    <div className="bg-surface border border-hairline rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                        <h4 className="font-semibold text-ink text-base">Insert Link</h4>
                        <div>
                            <label className={labelClass}>Link Text</label>
                            <input
                                value={linkText}
                                onChange={(e) => setLinkText(e.target.value)}
                                className={inputClass}
                                placeholder="Clickable text"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>URL</label>
                            <input
                                autoFocus
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                className={inputClass}
                                placeholder="https://… or /everyday-yoga"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={() => setLinkModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={applyLink}>Insert Link</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---------------------------------------------------- MARKDOWN CHEATSHEET MODAL */}
            {showHelpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setShowHelpModal(false)}>
                    <div className="bg-surface border border-hairline rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-2 border-b border-hairline">
                            <h4 className="font-semibold text-ink text-base flex items-center gap-1.5">
                                <LuCircleHelp className="text-primary" /> Markdown Cheatsheet &amp; Shortcuts
                            </h4>
                            <button type="button" onClick={() => setShowHelpModal(false)} className="text-ink-subtle hover:text-ink">
                                <LuX />
                            </button>
                        </div>
                        <div className="text-xs space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-hairline">
                                <span className="font-mono text-ink-muted font-bold"># Heading 1</span>
                                <span className="text-ink">Main section</span>
                                <span className="font-mono text-ink-muted font-bold">## Heading 2</span>
                                <span className="text-ink">Sub-section</span>
                                <span className="font-mono text-ink-muted font-bold">**bold text**</span>
                                <span className="text-ink font-bold">Bold</span>
                                <span className="font-mono text-ink-muted font-bold">*italic text*</span>
                                <span className="text-ink italic">Italic</span>
                                <span className="font-mono text-ink-muted font-bold">[text](https://…)</span>
                                <span className="text-secondary underline">Clickable link</span>
                                <span className="font-mono text-ink-muted font-bold">![alt](image.jpg)</span>
                                <span className="text-ink">Embedded image</span>
                                <span className="font-mono text-ink-muted font-bold">&gt; quote</span>
                                <span className="text-ink">Blockquote card</span>
                                <span className="font-mono text-ink-muted font-bold">- bullet</span>
                                <span className="text-ink">• Bullet list item</span>
                                <span className="font-mono text-ink-muted font-bold">1. numbered</span>
                                <span className="text-ink">1. Numbered item</span>
                            </div>
                            <div>
                                <h5 className="font-semibold text-ink mb-1">Keyboard Shortcuts</h5>
                                <ul className="space-y-1 text-ink-muted">
                                    <li><kbd className="px-1.5 py-0.5 bg-surface-sunken border rounded text-[11px]">Cmd/Ctrl + S</kbd> Save draft</li>
                                    <li><kbd className="px-1.5 py-0.5 bg-surface-sunken border rounded text-[11px]">Cmd/Ctrl + B</kbd> Bold selection</li>
                                    <li><kbd className="px-1.5 py-0.5 bg-surface-sunken border rounded text-[11px]">Cmd/Ctrl + I</kbd> Italic selection</li>
                                    <li><kbd className="px-1.5 py-0.5 bg-surface-sunken border rounded text-[11px]">Cmd/Ctrl + K</kbd> Insert link</li>
                                </ul>
                            </div>
                            <div className="pt-1">
                                <h5 className="font-semibold text-ink mb-1">Image Uploading</h5>
                                <p className="text-ink-muted">
                                    You can drag-and-drop any image file directly into the editor body or click the image icon in the toolbar. It will automatically upload and insert into the article.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button onClick={() => setShowHelpModal(false)}>Got it</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
