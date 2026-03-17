"use client";

import { useState, useMemo } from "react";

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

export default function DTable<T extends { id: string | number;[key: string]: any }>({
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
            // Global Search
            const matchesSearch = !searchTerm || Object.values(item).some((val) =>
                String(val).toLowerCase().includes(searchTerm.toLowerCase())
            );

            // Column Filters
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
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

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

    // Handlers
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
        setCurrentPage(1); // Reset to first page on filter change
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
                return typeof val === 'object' ? '' : `"${val}"`; // Simple handling
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header & Controls */}
            <div className="p-6 border-b border-gray-100 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    {title && <h2 className="font-serif text-xl text-gray-800">{title}</h2>}

                    <div className="flex gap-4 w-full md:w-auto">
                        {searchable && (
                            <input
                                type="text"
                                placeholder="Search..."
                                className="px-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary w-full md:w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        )}
                        <button
                            onClick={handleExportCSV}
                            className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-bold uppercase tracking-widest rounded hover:bg-gray-50 transition-colors"
                        >
                            Export
                        </button>
                        {onCreate && (
                            <button
                                onClick={onCreate}
                                className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors whitespace-nowrap"
                            >
                                + Create
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters & Bulk Actions */}
                {(filters || (enableBulkActions && selectedItems.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                        {enableBulkActions && selectedItems.length > 0 && (
                            <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded border border-red-100">
                                <span className="text-xs font-bold text-red-800">{selectedItems.length} selected</span>
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
                                className="px-3 py-1.5 border border-gray-200 rounded text-sm bg-gray-50 focus:outline-none focus:border-primary"
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
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-xs">
                        <tr>
                            {enableBulkActions && (
                                <th className="p-4 w-10">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={paginatedData.length > 0 && selectedItems.length === paginatedData.length}
                                    />
                                </th>
                            )}
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={`p-4 ${col.className || ''} ${col.sortable ? 'cursor-pointer hover:text-gray-700' : ''}`}
                                    onClick={() => col.sortable && typeof col.accessor === 'string' && handleSort(col.accessor as string)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.header}
                                        {col.sortable && sortConfig?.key === col.accessor && (
                                            <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </div>
                                </th>
                            ))}
                            {actions && <th className="p-4 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item) => (
                                <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors ${selectedItems.includes(String(item.id)) ? 'bg-blue-50/30' : ''}`}>
                                    {enableBulkActions && (
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.includes(String(item.id))}
                                                onChange={() => handleSelectItem(String(item.id))}
                                            />
                                        </td>
                                    )}
                                    {columns.map((col, idx) => (
                                        <td key={idx} className="p-4 text-gray-700">
                                            {typeof col.accessor === 'function'
                                                ? col.accessor(item)
                                                : (item[col.accessor] as React.ReactNode)}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="p-4 text-right">
                                            {actions(item)}
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0) + (enableBulkActions ? 1 : 0)} className="p-8 text-center text-gray-400">
                                    No data found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer / Pagination */}
            <div className="p-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                <span>Showing {paginatedData.length} of {sortedData.length} entries</span>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span>Page {currentPage} of {totalPages || 1}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
