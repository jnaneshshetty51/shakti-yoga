"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuSearch, LuX } from "react-icons/lu";
import { NAV, visibleNavGroups, type Department, type NavItem } from "./nav";

interface FlatItem extends NavItem {
  category: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  /** Same visibility scoping the sidebar applies — keeps ⌘K from surfacing pages a scoped admin can't actually open. */
  department: Department | null;
  isSuper: boolean;
}

export function CommandPalette({ isOpen, onClose, department, isSuper }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commandItems: FlatItem[] = useMemo(
    () =>
      visibleNavGroups(department, isSuper).flatMap((g) =>
        g.items.map((item) => ({ ...item, category: g.label }))
      ),
    [department, isSuper]
  );

  const filteredItems = commandItems.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.description?.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) {
        // Open with Cmd+K or Ctrl+K
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault();
          // This will be handled by parent component
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
          break;
        case "Enter":
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            router.push(filteredItems[selectedIndex].href);
            onClose();
            setQuery("");
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          setQuery("");
          break;
      }
    },
    [isOpen, filteredItems, selectedIndex, router, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  // Group items by category, preserving NAV's own group order.
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, FlatItem[]>);
  const orderedCategories = NAV.map((g) => g.label).filter((label) => groupedItems[label]);

  let globalIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh] sm:pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Command Palette */}
      <div className="relative w-full max-w-xl max-h-[80vh] flex flex-col bg-surface rounded-card shadow-overlay border border-hairline overflow-hidden animate-slide-up">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-hairline">
          <LuSearch className="text-ink-subtle text-lg" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions..."
            className="flex-1 bg-transparent border-none outline-none text-ink placeholder-ink-subtle"
          />
          <button
            onClick={() => {
              onClose();
              setQuery("");
            }}
            className="p-1.5 hover:bg-black/[0.04] rounded-control transition-colors"
          >
            <LuX className="text-ink-subtle text-sm" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          {filteredItems.length === 0 ? (
            <div className="px-5 py-8 text-center text-ink-muted">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            orderedCategories.map((category) => {
              const items = groupedItems[category];
              return (
                <div key={category}>
                  <div className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-ink-subtle">
                    {category}
                  </div>
                  {items.map((item) => {
                    globalIndex++;
                    const isSelected = globalIndex === selectedIndex;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          onClose();
                          setQuery("");
                        }}
                        className={`flex items-center gap-4 px-5 py-3 transition-colors ${
                          isSelected ? "bg-brand/5" : "hover:bg-surface-hover"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 shrink-0 rounded-control flex items-center justify-center ${
                            isSelected ? "bg-brand/10 text-brand" : "bg-black/[0.04] text-ink-muted"
                          }`}
                        >
                          <Icon />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-ink">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-ink-muted">{item.description}</div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="hidden sm:block text-xs text-ink-subtle">
                            <kbd className="px-2 py-1 bg-black/[0.04] rounded text-ink-muted">↵</kbd>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="hidden sm:flex px-5 py-3 border-t border-hairline items-center justify-between text-xs text-ink-subtle">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 bg-black/[0.04] rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-black/[0.04] rounded ml-1">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-black/[0.04] rounded">↵</kbd> to select
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 bg-black/[0.04] rounded">esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}

// Hook to manage command palette state
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { isOpen, setIsOpen };
}
