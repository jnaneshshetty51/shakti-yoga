"use client";

import React, { useState } from "react";
import { LuPlus } from "react-icons/lu";

export type KanbanColumn<TId extends string = string> = {
    id: TId;
    title: string;
    tone?: "gray" | "blue" | "green" | "amber" | "red" | "purple" | "neutral";
    badgeText?: string;
    subtext?: string;
};

export interface KanbanBoardProps<T, TColId extends string = string> {
    columns: KanbanColumn<TColId>[];
    items: T[];
    getItemId: (item: T) => string;
    getItemColumnId: (item: T) => TColId;
    renderCard: (
        item: T,
        helpers: {
            prevColId: TColId | null;
            nextColId: TColId | null;
            moveToCol: (colId: TColId) => void;
        }
    ) => React.ReactNode;
    onMoveItem?: (itemId: string, targetColId: TColId) => void;
    onAddInColumn?: (colId: TColId) => void;
    emptyText?: string;
    className?: string;
}

export function KanbanBoard<T, TColId extends string = string>({
    columns,
    items,
    getItemId,
    getItemColumnId,
    renderCard,
    onMoveItem,
    onAddInColumn,
    emptyText = "No items in this stage",
    className = "",
}: KanbanBoardProps<T, TColId>) {
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<TColId | null>(null);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("text/plain", id);
        setDraggedId(id);
    };

    const handleDragOver = (e: React.DragEvent, colId: TColId) => {
        e.preventDefault();
        if (dragOverCol !== colId) {
            setDragOverCol(colId);
        }
    };

    const handleDrop = (e: React.DragEvent, colId: TColId) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain") || draggedId;
        setDraggedId(null);
        setDragOverCol(null);
        if (id && onMoveItem) {
            onMoveItem(id, colId);
        }
    };

    return (
        <div className={`w-full overflow-x-auto pb-4 scrollbar-thin ${className}`}>
            <div className="flex gap-4 min-w-[960px] items-start">
                {columns.map((col, colIndex) => {
                    const colItems = items.filter((item) => getItemColumnId(item) === col.id);
                    const isOver = dragOverCol === col.id;
                    const prevCol = colIndex > 0 ? columns[colIndex - 1].id : null;
                    const nextCol = colIndex < columns.length - 1 ? columns[colIndex + 1].id : null;

                    return (
                        <div
                            key={col.id}
                            onDragOver={(e) => handleDragOver(e, col.id)}
                            onDragLeave={() => setDragOverCol(null)}
                            onDrop={(e) => handleDrop(e, col.id)}
                            className={`flex-1 min-w-[280px] max-w-[340px] flex flex-col rounded-2xl border transition-colors ${
                                isOver
                                    ? "bg-brand/5 border-brand/40 shadow-sm"
                                    : "bg-surface-raised/40 border-hairline"
                            }`}
                        >
                            {/* Column Header */}
                            <div className="p-3.5 border-b border-hairline/60 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink font-sans">
                                        {col.title}
                                    </h4>
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface border border-hairline text-ink-subtle">
                                        {colItems.length}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1">
                                    {col.subtext && (
                                        <span className="text-[11px] font-medium text-ink-subtle mr-1">
                                            {col.subtext}
                                        </span>
                                    )}
                                    {onAddInColumn && (
                                        <button
                                            onClick={() => onAddInColumn(col.id)}
                                            title={`Add to ${col.title}`}
                                            className="w-6 h-6 rounded-md hover:bg-surface flex items-center justify-center text-ink-subtle hover:text-brand transition-colors"
                                        >
                                            <LuPlus className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Column Cards Container */}
                            <div className="p-2.5 flex flex-col gap-2.5 min-h-[420px] max-h-[calc(100vh-280px)] overflow-y-auto">
                                {colItems.length === 0 ? (
                                    <div className="h-32 flex flex-col items-center justify-center border border-dashed border-hairline/70 rounded-xl p-4 text-center">
                                        <p className="text-xs text-ink-subtle">{emptyText}</p>
                                    </div>
                                ) : (
                                    colItems.map((item) => {
                                        const itemId = getItemId(item);
                                        return (
                                            <div
                                                key={itemId}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, itemId)}
                                                className="group cursor-grab active:cursor-grabbing transition-transform"
                                            >
                                                {renderCard(item, {
                                                    prevColId: prevCol,
                                                    nextColId: nextCol,
                                                    moveToCol: (targetCol) => onMoveItem && onMoveItem(itemId, targetCol),
                                                })}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
