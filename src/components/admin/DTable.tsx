"use client";

import { useState, useMemo } from "react";
import { LuSearch, LuDownload, LuPlus, LuChevronLeft, LuChevronRight, LuArrowUpDown } from "react-icons/lu";

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
    onBulkDelete
}: DTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    // 1. Filter & Search
    const filteredData = useMemo(() => {
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
    }, [data, searchTerm, activeFilters]);

    // 2. Sorting
    const sortedData = useMemo(() => {
        if (!sortConfig) return filteredData;
        return [...filteredData].sort((a, b) => {
            const aValue = a[sortConfig.key] as string | number;
            const bValue = b[sortConfig.key] as string | number;
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortConfig]);

    // 3. Pagination
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedData.length / itemsPerPage);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const handleFilterChange = (key: string, value: string) => {
        setActiveFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
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

    const ctrlBtn =
        "inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors";

    return (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.04)] border border-gray-100 overflow-hidden">
            {/* Header & Controls */}
            <div className="p-4 sm:p-5 border-b border-gray-100 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                    {title && <h2 className="font-bold text-gray-800">{title}</h2>}

                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        {searchable && (
                            <div className="relative w-full md:w-72">
                                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                <input
                                    type="text"
                                    placeholder="Search…"
                                    className="w-full pl-9 pr-3 py-2 rounded-full border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={handleExportCSV} className={`${ctrlBtn} flex-1 sm:flex-none justify-center`}>
                                <LuDownload className="text-sm" /> Export
                            </button>
                            {onCreate && (
                                <button
                                    onClick={onCreate}
                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap flex-1 sm:flex-none"
                                >
                                    <LuPlus className="text-sm" /> New
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {(filters || (enableBulkActions && selectedItems.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-3">
                        {enableBulkActions && selectedItems.length > 0 && (
                            <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                                <span className="text-xs font-bold text-red-700">{selectedItems.length} selected</span>
                                <button
                                    onClick={() => {
                                        if (onBulkDelete) onBulkDelete(selectedItems);
                                        setSelectedItems([]);
                                    }}
                                    className="text-xs text-red-600 hover:text-red-800 underline"
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                        {filters?.map(filter => (
                            <select
                                key={filter.key}
                                className="px-3 py-1.5 border border-gray-200 rounded-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/70 text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                        <tr>
                            {enableBulkActions && (
                                <th className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        className="accent-primary"
                                        onChange={handleSelectAll}
                                        checked={paginatedData.length > 0 && selectedItems.length === paginatedData.length}
                                    />
                                </th>
                            )}
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={`px-4 py-3 ${col.className || ''} ${col.sortable ? 'cursor-pointer hover:text-gray-600 select-none' : ''}`}
                                    onClick={() => col.sortable && typeof col.accessor === 'string' && handleSort(col.accessor as string)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.header}
                                        {col.sortable && (
                                            sortConfig?.key === col.accessor
                                                ? <span className="text-primary">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                : <LuArrowUpDown className="text-[11px] opacity-40" />
                                        )}
                                    </div>
                                </th>
                            ))}
                            {actions && <th className="px-4 py-3 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item) => (
                                <tr key={item.id} className={`hover:bg-gray-50/60 transition-colors ${selectedItems.includes(String(item.id)) ? 'bg-primary/[0.03]' : ''}`}>
                                    {enableBulkActions && (
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                className="accent-primary"
                                                checked={selectedItems.includes(String(item.id))}
                                                onChange={() => handleSelectItem(String(item.id))}
                                            />
                                        </td>
                                    )}
                                    {columns.map((col, idx) => (
                                        <td key={idx} className="px-4 py-3 text-gray-600 align-middle">
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
                                <td colSpan={columns.length + (actions ? 1 : 0) + (enableBulkActions ? 1 : 0)} className="px-4 py-12 text-center text-gray-400">
                                    Nothing to show yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer / Pagination */}
            <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap justify-between items-center gap-3 text-xs text-gray-500">
                <span>Showing {paginatedData.length} of {sortedData.length}</span>
                <div className="flex gap-1.5 items-center">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Previous page"
                    >
                        <LuChevronLeft className="text-sm" />
                    </button>
                    <span className="tabular-nums px-1">Page {currentPage} / {totalPages || 1}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Next page"
                    >
                        <LuChevronRight className="text-sm" />
                    </button>
                </div>
            </div>
        </div>
    );
}
