"use client";

import { useState, useMemo, useEffect } from "react";
import { LuSearch, LuDownload, LuPlus, LuChevronLeft, LuChevronRight, LuArrowUpDown } from "react-icons/lu";
import { Button } from "./ui";

type Column<T> = {
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    className?: string;
    sortable?: boolean;
};

type FilterOption = {
    label: string;
    value: string;
};

type FilterConfig = {
    key: string;
    label: string;
    options: FilterOption[];
};

type BulkAction = {
    label: string;
    tone?: "danger" | "default";
    onClick: (selectedIds: string[]) => void;
};

/**
 * Opt-in server-driven mode: `data` is assumed to already be just the
 * current page's rows (fetched by the parent from the server), so DTable
 * skips its own client-side filter/sort/paginate entirely and instead
 * forwards every search/filter/sort/page change up to the parent, which owns
 * fetching the right slice. Without this prop DTable behaves exactly as
 * before — client-side over whatever's in `data`.
 */
type ServerMode = {
    page: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    /** Debounced ~300ms by DTable before calling. Reset to page 1 is the caller's responsibility. */
    onSearchChange?: (q: string) => void;
    /** Reset to page 1 is the caller's responsibility. */
    onFilterChange?: (key: string, value: string) => void;
    onSortChange?: (key: string, direction: 'asc' | 'desc') => void;
};

type DTableProps<T> = {
    data: T[];
    columns: Column<T>[];
    title?: string;
    searchable?: boolean;
    filters?: FilterConfig[];
    enableBulkActions?: boolean;
    actions?: (item: T) => React.ReactNode;
    onCreate?: () => void;
    onBulkDelete?: (selectedIds: string[]) => void;
    /** One or more bulk actions on the selection toolbar. Falls back to a single "Delete" action wired to onBulkDelete when omitted. */
    bulkActions?: BulkAction[];
    server?: ServerMode;
};

export default function DTable<T extends { id: string | number;[key: string]: unknown }>({
    data,
    columns,
    title,
    searchable = true,
    filters,
    enableBulkActions = false,
    actions,
    onCreate,
    onBulkDelete,
    bulkActions,
    server,
}: DTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    // Debounce search -> server.onSearchChange. Local searchTerm state still
    // drives the input's own display regardless of mode.
    useEffect(() => {
        if (!server?.onSearchChange) return;
        const t = setTimeout(() => server.onSearchChange!(searchTerm), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on searchTerm; server.onSearchChange is expected to be referentially stable enough for this
    }, [searchTerm]);

    // 1. Filter & Search — skipped entirely in server mode; `data` is already the right slice.
    const filteredData = useMemo(() => {
        if (server) return data;
        return data.filter((item) => {
            const matchesSearch = !searchTerm || Object.values(item).some((val) =>
                String(val).toLowerCase().includes(searchTerm.toLowerCase())
            );
            const matchesFilters = Object.entries(activeFilters).every(([key, value]) => {
                if (!value) return true;
                return String(item[key]) === value;
            });
            return matchesSearch && matchesFilters;
        });
    }, [data, searchTerm, activeFilters, server]);

    // 2. Sorting — skipped in server mode (the fetched page is already sorted server-side).
    const sortedData = useMemo(() => {
        if (server || !sortConfig) return filteredData;
        return [...filteredData].sort((a, b) => {
            const aValue = a[sortConfig.key] as string | number;
            const bValue = b[sortConfig.key] as string | number;
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortConfig, server]);

    // 3. Pagination — skipped in server mode (`data` is already one page).
    const paginatedData = useMemo(() => {
        if (server) return sortedData;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage, server]);

    const totalPages = server
        ? Math.max(1, Math.ceil(server.totalCount / server.pageSize))
        : Math.ceil(sortedData.length / itemsPerPage);
    const currentPageNum = server ? server.page : currentPage;

    const handleSort = (key: string) => {
        setSortConfig(current => {
            const next: { key: string; direction: 'asc' | 'desc' } =
                current?.key === key
                    ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
                    : { key, direction: 'asc' };
            server?.onSortChange?.(next.key, next.direction);
            return next;
        });
    };

    const handleFilterChange = (key: string, value: string) => {
        setActiveFilters(prev => ({ ...prev, [key]: value }));
        if (server) server.onFilterChange?.(key, value);
        else setCurrentPage(1);
    };

    const goToPage = (updater: (p: number) => number) => {
        if (server) server.onPageChange(updater(server.page));
        else setCurrentPage(updater);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedItems(paginatedData.map(item => String(item.id)));
        } else {
            setSelectedItems([]);
        }
    };

    const handleSelectItem = (id: string) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleExportCSV = () => {
        if (sortedData.length === 0) return;
        const headers = columns.map(col => col.header).join(',');
        const rows = sortedData.map(item =>
            columns.map(col => {
                const val = item[col.accessor as keyof T];
                return typeof val === 'object' ? '' : `"${val}"`;
            }).join(',')
        );
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${title || 'data'}_export.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-surface rounded-card shadow-raised border border-hairline overflow-hidden">
            {/* Header & Controls */}
            <div className="p-4 sm:p-5 border-b border-hairline space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                    {title && <h2 className="font-semibold text-ink">{title}</h2>}

                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        {searchable && (
                            <div className="relative w-full md:w-72">
                                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-sm" />
                                <input
                                    type="text"
                                    placeholder="Search…"
                                    className="w-full pl-9 pr-3 py-2 rounded-control border border-hairline text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand/40 transition"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="secondary" size="sm" icon={LuDownload} onClick={handleExportCSV} className="flex-1 sm:flex-none justify-center">
                                Export
                            </Button>
                            {onCreate && (
                                <Button size="sm" icon={LuPlus} onClick={onCreate} className="flex-1 sm:flex-none justify-center whitespace-nowrap">
                                    New
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {(filters || (enableBulkActions && selectedItems.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-3">
                        {enableBulkActions && selectedItems.length > 0 && (
                            <div className="flex items-center gap-3 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                                <span className="text-xs font-bold text-red-700">{selectedItems.length} selected</span>
                                {(bulkActions ?? (onBulkDelete ? [{ label: "Delete", tone: "danger" as const, onClick: onBulkDelete }] : [])).map((a) => (
                                    <button
                                        key={a.label}
                                        onClick={() => {
                                            a.onClick(selectedItems);
                                            setSelectedItems([]);
                                        }}
                                        className={`text-xs underline ${a.tone === "danger" ? "text-red-600 hover:text-red-800" : "text-gray-600 hover:text-gray-800"}`}
                                    >
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        {filters?.map(filter => (
                            <select
                                key={filter.key}
                                className="px-3 py-1.5 border border-hairline rounded-control text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand/25"
                                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                                value={activeFilters[filter.key] || ''}
                            >
                                <option value="">All {filter.label}</option>
                                {filter.options.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        ))}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-black/[0.02] text-ink-subtle font-semibold uppercase tracking-wider text-[11px]">
                        <tr>
                            {enableBulkActions && (
                                <th className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        className="accent-brand"
                                        onChange={handleSelectAll}
                                        checked={paginatedData.length > 0 && selectedItems.length === paginatedData.length}
                                    />
                                </th>
                            )}
                            {columns.map((col, idx) => {
                                // A sortable column with no way to actually sort the full,
                                // server-side dataset would silently only sort the current
                                // page — misleading. Only honor `sortable` in server mode
                                // when the parent gave us a way to ask for a real re-sort.
                                const canSort = col.sortable && (!server || server.onSortChange);
                                return (
                                <th
                                    key={idx}
                                    className={`px-4 py-3 ${col.className || ''} ${canSort ? 'cursor-pointer hover:text-ink-muted select-none' : ''}`}
                                    onClick={() => canSort && typeof col.accessor === 'string' && handleSort(col.accessor as string)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.header}
                                        {canSort && (
                                            sortConfig?.key === col.accessor
                                                ? <span className="text-brand">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                : <LuArrowUpDown className="text-[11px] opacity-40" />
                                        )}
                                    </div>
                                </th>
                                );
                            })}
                            {actions && <th className="px-4 py-3 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item) => (
                                <tr key={item.id} className={`hover:bg-surface-hover transition-colors ${selectedItems.includes(String(item.id)) ? 'bg-brand/[0.04]' : ''}`}>
                                    {enableBulkActions && (
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                className="accent-brand"
                                                checked={selectedItems.includes(String(item.id))}
                                                onChange={() => handleSelectItem(String(item.id))}
                                            />
                                        </td>
                                    )}
                                    {columns.map((col, idx) => (
                                        <td key={idx} className="px-4 py-3 text-ink-muted align-middle">
                                            {typeof col.accessor === 'function'
                                                ? col.accessor(item)
                                                : (item[col.accessor] as React.ReactNode)}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            {actions(item)}
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0) + (enableBulkActions ? 1 : 0)} className="px-4 py-12 text-center text-ink-subtle">
                                    Nothing to show yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer / Pagination */}
            <div className="px-4 py-3 border-t border-hairline flex flex-wrap justify-between items-center gap-3 text-xs text-ink-muted">
                <span>Showing {paginatedData.length} of {server ? server.totalCount : sortedData.length}</span>
                <div className="flex gap-1.5 items-center">
                    <button
                        onClick={() => goToPage(p => Math.max(1, p - 1))}
                        disabled={currentPageNum === 1}
                        className="p-1.5 rounded-control border border-hairline hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Previous page"
                    >
                        <LuChevronLeft className="text-sm" />
                    </button>
                    <span className="tabular-nums px-1">Page {currentPageNum} / {totalPages || 1}</span>
                    <button
                        onClick={() => goToPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPageNum === totalPages || totalPages === 0}
                        className="p-1.5 rounded-control border border-hairline hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Next page"
                    >
                        <LuChevronRight className="text-sm" />
                    </button>
                </div>
            </div>
        </div>
    );
}
