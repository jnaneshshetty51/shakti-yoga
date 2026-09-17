"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LuSearch, LuChevronDown, LuX, LuCheck, LuUser } from "react-icons/lu";
import type { StudentLookupItem } from "@/context/AdminStudentContext";

interface StudentDropdownProps {
    value?: string; // student email or id
    onChange: (student: StudentLookupItem | null) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
}

export function StudentDropdown({
    value,
    onChange,
    placeholder = "Select or search student…",
    label,
    required,
    disabled,
    className = "",
}: StudentDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<StudentLookupItem[]>([]);
    const [selected, setSelected] = useState<StudentLookupItem | null>(null);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initial search or lookup if value is present
    useEffect(() => {
        if (!value) {
            setSelected(null);
            return;
        }

        // If current selected already matches, keep it
        if (selected && (selected.id === value || selected.email.toLowerCase() === value.toLowerCase())) {
            return;
        }

        // Otherwise lookup by value
        let active = true;
        fetch(`/api/admin/students/lookup?q=${encodeURIComponent(value)}&limit=5`)
            .then((res) => (res.ok ? res.json() : { students: [] }))
            .then((data) => {
                if (!active) return;
                const match = (data.students || []).find(
                    (s: StudentLookupItem) => s.id === value || s.email.toLowerCase() === value.toLowerCase()
                );
                if (match) setSelected(match);
            })
            .catch(() => {});

        return () => {
            active = false;
        };
    }, [value, selected]);

    // Close on click outside
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

    const fetchOptions = useCallback(async (searchQuery: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery.trim()) params.set("q", searchQuery.trim());
            params.set("limit", "20");
            const res = await fetch(`/api/admin/students/lookup?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setResults(data.students || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            fetchOptions(query);
        }, 200);
        return () => clearTimeout(timer);
    }, [query, isOpen, fetchOptions]);

    const handleSelect = (student: StudentLookupItem) => {
        setSelected(student);
        onChange(student);
        setIsOpen(false);
        setQuery("");
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelected(null);
        onChange(null);
        setQuery("");
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {/* Selected box or trigger */}
            <div
                onClick={() => {
                    if (disabled) return;
                    setIsOpen((prev) => !prev);
                    if (!isOpen) {
                        setTimeout(() => inputRef.current?.focus(), 50);
                    }
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-control border text-sm transition cursor-pointer ${
                    disabled
                        ? "bg-surface-sunken opacity-60 cursor-not-allowed border-hairline"
                        : isOpen
                        ? "border-brand ring-2 ring-brand/20 bg-surface"
                        : "border-hairline bg-surface hover:border-brand/40"
                }`}
            >
                {selected ? (
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-6 h-6 rounded-full bg-brand/15 text-brand font-semibold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                            {selected.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={selected.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                selected.name.charAt(0)
                            )}
                        </div>
                        <div className="min-w-0 flex-1 truncate">
                            <span className="font-semibold text-ink">{selected.name}</span>
                            <span className="text-xs text-ink-subtle ml-2">({selected.email})</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 text-ink-subtle font-medium shrink-0">
                            {selected.plan}
                        </span>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-1 hover:bg-black/5 rounded-full text-ink-subtle hover:text-ink transition"
                                title="Clear student"
                            >
                                <LuX className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-ink-subtle">
                        <LuUser className="w-4 h-4 text-ink-subtle shrink-0" />
                        <span className="truncate">{placeholder}</span>
                    </div>
                )}
                <LuChevronDown className="w-4 h-4 text-ink-subtle shrink-0 ml-1" />
            </div>

            {/* Dropdown Popover */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface border border-hairline rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-100">
                    {/* Search box inside popover */}
                    <div className="p-2 border-b border-hairline bg-surface-sunken">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-surface rounded-lg border border-hairline focus-within:border-brand">
                            <LuSearch className="w-3.5 h-3.5 text-ink-subtle shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by name, email, phone…"
                                className="w-full bg-transparent text-xs text-ink placeholder-ink-subtle focus:outline-none"
                            />
                            {query && (
                                <button type="button" onClick={() => setQuery("")} className="text-ink-subtle hover:text-ink">
                                    <LuX className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options list */}
                    <div className="overflow-y-auto flex-1 divide-y divide-hairline">
                        {loading ? (
                            <div className="p-4 text-center text-xs text-ink-subtle">
                                <div className="inline-block w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin mb-1" />
                                <div>Loading students…</div>
                            </div>
                        ) : results.length === 0 ? (
                            <div className="p-4 text-center text-xs text-ink-subtle">
                                No matching students found
                            </div>
                        ) : (
                            results.map((student) => {
                                const isSelected = selected?.id === student.id;
                                return (
                                    <div
                                        key={student.id}
                                        onClick={() => handleSelect(student)}
                                        className={`flex items-center justify-between gap-2 px-3 py-2 text-left cursor-pointer transition ${
                                            isSelected ? "bg-brand/10 text-brand" : "hover:bg-surface-hover"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-full bg-brand/15 text-brand flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                                                {student.avatarUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={student.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    student.name.charAt(0)
                                                )}
                                            </div>
                                            <div className="truncate">
                                                <div className="text-xs font-medium text-ink flex items-center gap-1.5">
                                                    <span>{student.name}</span>
                                                    {isSelected && <LuCheck className="w-3 h-3 text-brand" />}
                                                </div>
                                                <div className="text-[10px] text-ink-subtle truncate">
                                                    {student.email}
                                                    {student.phone && ` • ${student.phone}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/5 text-ink-subtle">
                                                {student.plan}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
