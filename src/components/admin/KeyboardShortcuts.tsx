"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "./Modal";
import { FaKeyboard } from "react-icons/fa";

interface Shortcut {
  keys: string[];
  description: string;
  action?: string;
}

interface ShortcutCategory {
  name: string;
  shortcuts: Shortcut[];
}

const shortcutCategories: ShortcutCategory[] = [
  {
    name: "Navigation",
    shortcuts: [
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "U"], description: "Go to Users" },
      { keys: ["G", "L"], description: "Go to Leads" },
      { keys: ["G", "A"], description: "Go to Analytics" },
      { keys: ["G", "C"], description: "Go to Content" },
    ],
  },
  {
    name: "Actions",
    shortcuts: [
      { keys: ["N"], description: "Create new item" },
      { keys: ["E"], description: "Edit selected" },
      { keys: ["⌘", "S"], description: "Save current form" },
      { keys: ["Esc"], description: "Close modal / Cancel" },
    ],
  },
  {
    name: "Search",
    shortcuts: [
      { keys:["/"], description: "Focus search" },
      { keys: ["⌘", "K"], description: "Open command palette" },
    ],
  },
];

interface KeyboardShortcutsHelpProps {
  trigger?: React.ReactNode;
}

export function KeyboardShortcutsHelp({ trigger }: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Open help modal with ?
    if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
      const target = e.target as HTMLElement;
      if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
        e.preventDefault();
        setIsOpen(true);
      }
    }
    
    // Open command palette with ⌘K or Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      // Could dispatch to a global command palette
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {trigger ? (
        <button onClick={() => setIsOpen(true)}>{trigger}</button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 z-40 p-3 bg-white border border-gray-200 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
          aria-label="Keyboard shortcuts"
        >
          <FaKeyboard className="text-gray-600 w-5 h-5" />
        </button>
      )}
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Keyboard Shortcuts"
        subtitle="Work faster with keyboard shortcuts"
        size="md"
      >
        <div className="space-y-8">
          {shortcutCategories.map((category) => (
            <div key={category.name}>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                {category.name}
              </h4>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex gap-1">
                          <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-medium text-gray-700">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-gray-400 text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            Press <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-medium">?</kbd> anywhere to open this dialog
          </p>
        </div>
      </Modal>
    </>
  );
}
