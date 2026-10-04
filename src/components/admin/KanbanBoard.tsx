"use client";

import React, { useState } from "react";
import { LuPlus, LuArrowLeft, LuArrowRight } from "react-icons/lu";

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

    const totalItems = items.length;

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "move";
        setDraggedId(id);
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverCol(null);
    };

    const handleDragOver = (e: React.DragEvent, colId: TColId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOverCol !== colId) {
            setDragOverCol(colId);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Prevent premature clearing if hovering over children
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragOverCol(null);
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
            <div className="flex gap-4 min-w-[980px] items-start">
                {columns.map((col, colIndex) => {
                    const colItems = items.filter((item) => getItemColumnId(item) === col.id);
                    const isOver = dragOverCol === col.id;
                    const prevCol = colIndex > 0 ? columns[colIndex - 1].id : null;
                    const nextCol = colIndex < columns.length - 1 ? columns[colIndex + 1].id : null;
                    const colPercentage = totalItems > 0 ? Math.round((colItems.length / totalItems) * 100) : 0;

                    return (
                        <div
                            key={col.id}
                            onDragOver={(e) => handleDragOver(e, col.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, col.id)}
                            className={`flex-1 min-w-[280px] max-w-[340px] flex flex-col rounded-2xl border transition-all duration-200 ${
                                isOver
                                    ? "bg-brand/10 border-brand/50 shadow-md ring-2 ring-brand/20 scale-[1.008]"
                                    : "bg-surface-raised/40 border-hairline"
                            }`}
                        >
                            {/* Column Header */}
                            <div className="p-3.5 border-b border-hairline/60 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink font-sans">
                                        {col.title}
                                    </h4>
                                    <span
                                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface border border-hairline text-ink-subtle"
                                        title={`${colPercentage}% of total leads`}
                                    >
                                        {colItems.length}
                                        {totalItems > 0 && (
                                            <span className="text-[10px] text-ink-muted ml-1 font-normal">
                                                ({colPercentage}%)
                                            </span>
                                        )}
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
                                            type="button"
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
                            <div className="p-2.5 flex flex-col gap-2.5 min-h-[440px] max-h-[calc(100vh-280px)] overflow-y-auto">
                                {colItems.length === 0 ? (
                                    <div
                                        className={`h-32 flex flex-col items-center justify-center border border-dashed rounded-xl p-4 text-center transition-colors ${
                                            isOver ? "border-brand/40 bg-brand/5 text-brand" : "border-hairline/70 text-ink-subtle"
                                        }`}
                                    >
                                        <p className="text-xs">
                                            {isOver ? "Drop lead here" : emptyText}
                                        </p>
                                    </div>
                                ) : (
                                    colItems.map((item) => {
                                        const itemId = getItemId(item);
                                        const isDragging = draggedId === itemId;

                                        return (
                                            <div
                                                key={itemId}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, itemId)}
                                                onDragEnd={handleDragEnd}
                                                className={`group cursor-grab active:cursor-grabbing transition-all duration-150 ${
                                                    isDragging
                                                        ? "opacity-35 scale-[0.98] ring-2 ring-brand/40 rounded-xl"
                                                        : "hover:-translate-y-0.5"
                                                }`}
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
