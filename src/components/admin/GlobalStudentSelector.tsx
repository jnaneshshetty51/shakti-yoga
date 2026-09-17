"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    LuSearch,
    LuGraduationCap,
    LuChevronDown,
    LuX,
    LuCheck,
    LuCalendar,
    LuActivity,
    LuReceipt,
    LuExternalLink,
    LuHistory,
    LuUser,
} from "react-icons/lu";
import { useAdminStudent, type StudentLookupItem } from "@/context/AdminStudentContext";

export function GlobalStudentSelector() {
    const { selectedStudent, setSelectedStudent, recentStudents, clearSelectedStudent } = useAdminStudent();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<StudentLookupItem[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setQuery("");
        }
    }, [isOpen]);

    // Search query debounced
    const searchStudents = useCallback(async (q: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (q.trim()) params.set("q", q.trim());
            params.set("limit", "15");
            const res = await fetch(`/api/admin/students/lookup?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setResults(data.students || []);
            }
        } catch (err) {
            console.error("Student lookup failed:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            searchStudents(query);
        }, 220);
        return () => clearTimeout(timer);
    }, [query, isOpen, searchStudents]);

    const handleSelect = (student: StudentLookupItem) => {
        setSelectedStudent(student);
        setIsOpen(false);
    };

    const handleSelectAndJump = (student: StudentLookupItem, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedStudent(student);
        setIsOpen(false);
        router.push(`/admin/members/${student.id}`);
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs sm:text-sm font-medium transition-all shadow-xs ${
                    selectedStudent
                        ? "bg-brand/10 border-brand/30 text-brand hover:bg-brand/15"
                        : "bg-surface border-hairline text-ink-muted hover:border-brand/40 hover:text-ink hover:bg-surface-hover"
                }`}
                title={selectedStudent ? `Selected: ${selectedStudent.name}` : "Select active student"}
            >
                {selectedStudent ? (
                    <>
                        <div className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden">
                            {selectedStudent.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={selectedStudent.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                selectedStudent.name.charAt(0) || "S"
                            )}
                        </div>
                        <span className="truncate max-w-[90px] sm:max-w-[140px] font-semibold text-ink">
                            {selectedStudent.name}
                        </span>
                        <span className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand/15 text-brand truncate max-w-[100px]">
                            {selectedStudent.plan}
                        </span>
                        <LuChevronDown className="w-3.5 h-3.5 text-brand shrink-0" />
                    </>
                ) : (
                    <>
                        <LuGraduationCap className="w-4 h-4 text-brand shrink-0" />
                        <span className="truncate max-w-[110px] sm:max-w-none">Select student…</span>
                        <LuChevronDown className="w-3.5 h-3.5 text-ink-subtle shrink-0" />
                    </>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-[calc(100vw-32px)] sm:w-[420px] max-h-[80vh] bg-surface rounded-2xl shadow-xl border border-hairline z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Active Student Highlight Card */}
                    {selectedStudent && (
                        <div className="p-3 bg-brand/5 border-b border-hairline">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
                                    Currently Selected Student
                                </span>
                                <button
                                    onClick={() => clearSelectedStudent()}
                                    className="text-[11px] text-ink-subtle hover:text-red-600 flex items-center gap-1 transition-colors"
                                >
                                    <LuX className="w-3 h-3" /> Clear
                                </button>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-brand/20 text-brand font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                                    {selectedStudent.avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={selectedStudent.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        selectedStudent.name.charAt(0)
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-ink truncate">{selectedStudent.name}</div>
                                    <div className="text-xs text-ink-subtle truncate flex items-center gap-2">
                                        <span>{selectedStudent.email}</span>
                                        {selectedStudent.phone && (
                                            <>
                                                <span>•</span>
                                                <span>{selectedStudent.phone}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                        selectedStudent.status === "Active"
                                            ? "bg-green-100 text-green-800"
                                            : selectedStudent.status === "Trial"
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-gray-100 text-gray-700"
                                    }`}
                                >
                                    {selectedStudent.status}
                                </span>
                            </div>

                            {/* Quick Action Buttons for Active Student */}
                            <div className="mt-3 pt-2.5 border-t border-brand/15 grid grid-cols-4 gap-1.5 text-center">
                                <Link
                                    href={`/admin/members/${selectedStudent.id}`}
                                    onClick={() => setIsOpen(false)}
                                    className="px-1 py-1.5 rounded-lg bg-surface hover:bg-brand/10 text-ink hover:text-brand border border-hairline text-[11px] font-medium flex flex-col items-center gap-1 transition-colors"
                                >
                                    <LuUser className="w-3.5 h-3.5 text-brand" />
                                    <span>360 Profile</span>
                                </Link>
                                <Link
                                    href={`/admin/bookings?q=${encodeURIComponent(selectedStudent.name)}`}
                                    onClick={() => setIsOpen(false)}
                                    className="px-1 py-1.5 rounded-lg bg-surface hover:bg-brand/10 text-ink hover:text-brand border border-hairline text-[11px] font-medium flex flex-col items-center gap-1 transition-colors"
                                >
                                    <LuCalendar className="w-3.5 h-3.5 text-brand" />
                                    <span>Bookings</span>
                                </Link>
                                <Link
                                    href={`/admin/therapy?patientId=${selectedStudent.id}`}
                                    onClick={() => setIsOpen(false)}
                                    className="px-1 py-1.5 rounded-lg bg-surface hover:bg-brand/10 text-ink hover:text-brand border border-hairline text-[11px] font-medium flex flex-col items-center gap-1 transition-colors"
                                >
                                    <LuActivity className="w-3.5 h-3.5 text-brand" />
                                    <span>Therapy</span>
                                </Link>
                                <Link
                                    href={`/admin/invoices?q=${encodeURIComponent(selectedStudent.email)}`}
                                    onClick={() => setIsOpen(false)}
                                    className="px-1 py-1.5 rounded-lg bg-surface hover:bg-brand/10 text-ink hover:text-brand border border-hairline text-[11px] font-medium flex flex-col items-center gap-1 transition-colors"
                                >
                                    <LuReceipt className="w-3.5 h-3.5 text-brand" />
                                    <span>Invoices</span>
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Search Input Bar */}
                    <div className="p-3 border-b border-hairline bg-surface">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-hairline bg-surface-sunken focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all">
                            <LuSearch className="w-4 h-4 text-ink-subtle shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by name, email, or phone…"
                                className="w-full bg-transparent text-sm text-ink placeholder-ink-subtle focus:outline-none"
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery("")}
                                    className="text-ink-subtle hover:text-ink p-0.5"
                                >
                                    <LuX className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Students List Container */}
                    <div className="flex-1 overflow-y-auto max-h-[360px] divide-y divide-hairline">
                        {/* Recent Students Section (when query is empty and recents exist) */}
                        {!query.trim() && recentStudents.length > 0 && (
                            <div className="p-2">
                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-subtle flex items-center gap-1.5">
                                    <LuHistory className="w-3 h-3" /> Recent Students
                                </div>
                                <div className="space-y-0.5 mt-1">
                                    {recentStudents.map((student) => {
                                        const isSelected = selectedStudent?.id === student.id;
                                        return (
                                            <div
                                                key={`recent-${student.id}`}
                                                onClick={() => handleSelect(student)}
                                                className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors ${
                                                    isSelected ? "bg-brand/10 text-brand" : "hover:bg-surface-hover"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-7 h-7 rounded-full bg-brand/15 text-brand flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                                                        {student.avatarUrl ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={student.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            student.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 truncate">
                                                        <div className="text-xs font-semibold text-ink truncate flex items-center gap-1.5">
                                                            <span>{student.name}</span>
                                                            {isSelected && <LuCheck className="w-3 h-3 text-brand" />}
                                                        </div>
                                                        <div className="text-[11px] text-ink-subtle truncate">
                                                            {student.email}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/5 text-ink-subtle">
                                                        {student.plan}
                                                    </span>
                                                    <button
                                                        onClick={(e) => handleSelectAndJump(student, e)}
                                                        className="p-1 rounded-md text-ink-subtle hover:text-brand hover:bg-brand/10 transition-colors"
                                                        title="Open 360 profile"
                                                    >
                                                        <LuExternalLink className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Search Results or Directory */}
                        <div className="p-2">
                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                                {query.trim() ? "Search Results" : "All Students"}
                            </div>

                            {loading ? (
                                <div className="py-6 text-center text-xs text-ink-subtle">
                                    <div className="inline-block w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin mb-1" />
                                    <div>Searching students…</div>
                                </div>
                            ) : results.length === 0 ? (
                                <div className="py-6 text-center text-xs text-ink-subtle">
                                    No students found matching &quot;{query}&quot;
                                </div>
                            ) : (
                                <div className="space-y-0.5 mt-1">
                                    {results.map((student) => {
                                        const isSelected = selectedStudent?.id === student.id;
                                        return (
                                            <div
                                                key={student.id}
                                                onClick={() => handleSelect(student)}
                                                className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors ${
                                                    isSelected ? "bg-brand/10 text-brand" : "hover:bg-surface-hover"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-7 h-7 rounded-full bg-brand/15 text-brand flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                                                        {student.avatarUrl ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={student.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            student.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 truncate">
                                                        <div className="text-xs font-semibold text-ink truncate flex items-center gap-1.5">
                                                            <span>{student.name}</span>
                                                            {isSelected && <LuCheck className="w-3 h-3 text-brand" />}
                                                        </div>
                                                        <div className="text-[11px] text-ink-subtle truncate">
                                                            {student.email}
                                                            {student.phone && ` • ${student.phone}`}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-semibold text-ink-muted">
                                                            {student.plan}
                                                        </div>
                                                        {student.therapyCredits > 0 && (
                                                            <div className="text-[9px] text-brand font-medium">
                                                                {student.therapyCredits} therapy credit{student.therapyCredits > 1 ? "s" : ""}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={(e) => handleSelectAndJump(student, e)}
                                                        className="p-1 rounded-md text-ink-subtle hover:text-brand hover:bg-brand/10 transition-colors"
                                                        title="Open 360 profile"
                                                    >
                                                        <LuExternalLink className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer / Quick Link to Students Hub */}
                    <div className="p-2.5 bg-surface-sunken border-t border-hairline flex items-center justify-between text-xs">
                        <span className="text-[11px] text-ink-subtle">
                            {selectedStudent ? `Active: ${selectedStudent.name}` : "Pick a student to switch focus"}
                        </span>
                        <Link
                            href="/admin/students"
                            onClick={() => setIsOpen(false)}
                            className="text-[11px] font-semibold text-brand hover:underline flex items-center gap-1"
                        >
                            All students & members &rarr;
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
