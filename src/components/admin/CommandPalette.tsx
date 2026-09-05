"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaSearch, FaHome, FaUsers, FaChartBar, FaEdit, FaCog, FaComments, FaCalendar, FaCreditCard, FaBook, FaTimes, FaUserCheck } from "react-icons/fa";

interface CommandItem {
  id: string;
  name: string;
  description?: string;
  icon: React.ReactNode;
  href: string;
  category: string;
}

const commandItems: CommandItem[] = [
  { id: "dashboard", name: "Dashboard", description: "View dashboard overview", icon: <FaHome />, href: "/admin", category: "Main" },
  { id: "analytics", name: "Analytics", description: "View analytics and reports", icon: <FaChartBar />, href: "/admin/analytics", category: "Main" },
  { id: "users", name: "Users & Members", description: "Manage users and members", icon: <FaUsers />, href: "/admin/users", category: "CRM" },
  { id: "leads", name: "Leads", description: "Manage leads and inquiries", icon: <FaUserCheck />, href: "/admin/leads", category: "CRM" },
  { id: "subscriptions", name: "Subscriptions", description: "Manage subscriptions", icon: <FaCreditCard />, href: "/admin/subscriptions", category: "CRM" },
  { id: "bookings", name: "Bookings", description: "Manage class bookings", icon: <FaCalendar />, href: "/admin/bookings", category: "CRM" },
  { id: "classes", name: "Classes", description: "Manage yoga classes", icon: <FaCalendar />, href: "/admin/classes", category: "Content" },
  { id: "content", name: "Blog Posts", description: "Manage blog content", icon: <FaEdit />, href: "/admin/content", category: "Content" },
  { id: "community", name: "Community", description: "Manage community posts", icon: <FaComments />, href: "/admin/community", category: "Content" },
  { id: "settings", name: "Settings", description: "Application settings", icon: <FaCog />, href: "/admin/settings", category: "Settings" },
  { id: "schedule", name: "Schedule", description: "Manage class schedule", icon: <FaCalendar />, href: "/admin/schedule", category: "Content" },
  { id: "stories", name: "Stories", description: "Manage member stories", icon: <FaBook />, href: "/admin/stories", category: "Content" },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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

  // Group items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  let globalIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Command Palette */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-slide-up">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <FaSearch className="text-gray-400 text-lg" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions..."
            className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
          />
          <button
            onClick={() => {
              onClose();
              setQuery("");
            }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaTimes className="text-gray-400 text-sm" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filteredItems.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-500">
              No results found for "{query}"
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, items]) => (
              <div key={category}>
                <div className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                  {category}
                </div>
                {items.map((item) => {
                  globalIndex++;
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => {
                        onClose();
                        setQuery("");
                      }}
                      className={`flex items-center gap-4 px-5 py-3 transition-colors ${
                        isSelected ? "bg-primary/5" : "hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSelected ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-gray-500">{item.description}</div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="text-xs text-gray-400">
                          <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-500">↵</kbd>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded ml-1">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↵</kbd> to select
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">esc</kbd> to close
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