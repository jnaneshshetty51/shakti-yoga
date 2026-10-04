"use client";

import { useState } from "react";
import {
    LuPin,
    LuPlus,
    LuFilter,
    LuHeartPulse,
    LuActivity,
    LuCalendar,
    LuShieldAlert,
    LuCheck,
    LuMessageSquare
} from "react-icons/lu";
import { useToast } from "@/components/admin/Toast";
import { formatDistanceToNow } from "date-fns";

export type ObservationNote = {
    id: string;
    author: string;
    category: "HEALTH" | "ASANA" | "ATTENDANCE" | "ADMIN" | string;
    note: string;
    isPinned: boolean;
    at: string;
};

interface Props {
    memberId: string;
    notes: ObservationNote[];
    onNoteAdded: () => void;
}

const CATEGORIES = [
    { key: "ALL", label: "All Notes" },
    { key: "HEALTH", label: "Health & Safety", tone: "red" },
    { key: "ASANA", label: "Asana & Flexibility", tone: "purple" },
    { key: "ATTENDANCE", label: "Attendance & Leave", tone: "amber" },
    { key: "ADMIN", label: "Administrative", tone: "gray" },
];

export function ObservationTimeline({ memberId, notes, onNoteAdded }: Props) {
    const { showToast } = useToast();
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [isCreating, setIsCreating] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [newCategory, setNewCategory] = useState("HEALTH");
    const [isPinned, setIsPinned] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const filteredNotes = notes.filter((n) => {
        if (selectedCategory === "ALL") return true;
        return n.category === selectedCategory;
    });

    const handleSubmitNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) {
            showToast("error", "Note text cannot be empty");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/members/${memberId}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category: newCategory,
                    note: newNote.trim(),
                    isPinned,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to record note");
            }

            showToast("success", "Observation note recorded");
            setNewNote("");
            setIsPinned(false);
            setIsCreating(false);
            onNoteAdded();
        } catch (err) {
            showToast("error", err instanceof Error ? err.message : "Error saving note");
        } finally {
            setSubmitting(false);
        }
    };

    const getCategoryBadge = (cat: string) => {
        switch (cat) {
            case "HEALTH":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                        <LuHeartPulse className="w-2.5 h-2.5 text-red-500" /> Health
                    </span>
                );
            case "ASANA":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <LuActivity className="w-2.5 h-2.5 text-purple-500" /> Asana
                    </span>
                );
            case "ATTENDANCE":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <LuCalendar className="w-2.5 h-2.5 text-amber-500" /> Attendance
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-raised text-ink-subtle border border-hairline">
                        Admin
                    </span>
                );
        }
    };

    return (
        <div className="space-y-3">
            {/* Header & Filter Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-hairline">
                <div className="flex flex-wrap items-center gap-1">
                    {CATEGORIES.map((c) => (
                        <button
                            type="button"
                            key={c.key}
                            onClick={() => setSelectedCategory(c.key)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                selectedCategory === c.key
                                    ? "bg-ink text-surface font-semibold shadow-xs"
                                    : "text-ink-subtle hover:text-ink hover:bg-surface-raised"
                            }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>

                {!isCreating && (
                    <button
                        type="button"
                        onClick={() => setIsCreating(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand/90 transition-colors shadow-xs"
                    >
                        <LuPlus className="w-3.5 h-3.5" /> Add Observation
                    </button>
                )}
            </div>

            {/* Creation Form Sheet */}
            {isCreating && (
                <form
                    onSubmit={handleSubmitNote}
                    className="p-3.5 rounded-xl border border-brand/30 bg-brand/5 space-y-3 animate-fade-in"
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-brand">New Teacher Observation</span>
                        <div className="flex items-center gap-1">
                            {["HEALTH", "ASANA", "ATTENDANCE", "ADMIN"].map((cat) => (
                                <button
                                    type="button"
                                    key={cat}
                                    onClick={() => setNewCategory(cat)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        newCategory === cat
                                            ? "bg-brand text-white shadow-2xs"
                                            : "bg-surface border border-hairline text-ink-subtle hover:text-ink"
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <textarea
                        rows={2}
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Write observations regarding student alignment, contraindications, progress or feedback..."
                        className="w-full text-xs rounded-xl border border-hairline bg-surface px-3 py-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:border-brand resize-none"
                    />

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={isPinned}
                                onChange={(e) => setIsPinned(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-hairline text-brand focus:ring-brand"
                            />
                            <span className="flex items-center gap-1 font-medium">
                                <LuPin className="w-3 h-3 text-amber-500" /> Pin note to top
                            </span>
                        </label>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-3 py-1 rounded-full text-xs font-medium text-ink-subtle hover:bg-surface-raised transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !newNote.trim()}
                                className="px-3.5 py-1 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand/90 transition-colors disabled:opacity-50"
                            >
                                {submitting ? "Saving..." : "Save Note"}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Notes List */}
            {filteredNotes.length === 0 ? (
                <div className="py-6 text-center text-xs text-ink-subtle italic">
                    No observation notes recorded in this category.
                </div>
            ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {filteredNotes.map((n) => (
                        <div
                            key={n.id}
                            className={`p-3 rounded-xl border text-xs transition-all space-y-1.5 ${
                                n.isPinned
                                    ? "border-amber-300 bg-amber-50/40 shadow-xs"
                                    : "border-hairline bg-surface"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {getCategoryBadge(n.category)}
                                    {n.isPinned && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700">
                                            <LuPin className="w-2.5 h-2.5 fill-amber-500 text-amber-600" /> Pinned
                                        </span>
                                    )}
                                </div>
                                <span className="text-[11px] text-ink-subtle">
                                    {formatDistanceToNow(new Date(n.at), { addSuffix: true })}
                                </span>
                            </div>

                            <p className="text-ink leading-relaxed whitespace-pre-wrap">{n.note}</p>

                            <div className="text-[10px] text-ink-subtle pt-0.5">
                                Logged by: <b>{n.author}</b>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
