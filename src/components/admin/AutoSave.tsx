"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useToast } from "./Toast";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  interval?: number; // Auto-save interval in ms (default: 30000 = 30 seconds)
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  saveNow: () => Promise<void>;
  hasUnsavedChanges: boolean;
  discardChanges: () => void;
}

export function useAutoSave<T>({
  data,
  onSave,
  interval = 30000,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const previousDataRef = useRef<T>(data);
  const { showToast } = useToast();

  // Track changes
  useEffect(() => {
    const isDifferent = JSON.stringify(data) !== JSON.stringify(previousDataRef.current);
    setHasUnsavedChanges(isDifferent);
  }, [data]);

  // Update initial data when explicitly set
  const discardChanges = useCallback(() => {
    setHasUnsavedChanges(false);
    previousDataRef.current = data;
  }, [data]);

  const saveNow = useCallback(async () => {
    if (!hasUnsavedChanges || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(data);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      previousDataRef.current = data;
      showToast("success", "Changes saved successfully");
    } catch (error) {
      showToast("error", "Failed to save changes. Please try again.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [data, hasUnsavedChanges, isSaving, onSave, showToast]);

  // Auto-save interval
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) return;

    const timer = setInterval(() => {
      saveNow();
    }, interval);

    return () => clearInterval(timer);
  }, [enabled, hasUnsavedChanges, saveNow, interval]);

  // Save before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    isSaving,
    lastSaved,
    saveNow,
    hasUnsavedChanges,
    discardChanges,
  };
}

// Debounced input hook for search/typeahead
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Typeahead search hook
interface UseTypeaheadOptions<T> {
  data: T[];
  searchField: keyof T;
  delay?: number;
}

interface UseTypeaheadReturn<T> {
  query: string;
  setQuery: (query: string) => void;
  debouncedQuery: string;
  results: T[];
  isSearching: boolean;
  clear: () => void;
}

export function useTypeahead<T>({
  data,
  searchField,
  delay = 300,
}: UseTypeaheadOptions<T>): UseTypeaheadReturn<T> {
  const [query, setQuery] = useState("");

  const debouncedQuery = useDebounce(query, delay);

  const results = useMemo(() => {
    if (!debouncedQuery) return data;

    const searchLower = debouncedQuery.toLowerCase();
    return data.filter((item) => {
      const value = item[searchField];
      return typeof value === "string" && value.toLowerCase().includes(searchLower);
    });
  }, [debouncedQuery, data, searchField]);

  const isSearching = query !== debouncedQuery;

  const clear = useCallback(() => {
    setQuery("");
  }, []);

  return {
    query,
    setQuery,
    debouncedQuery,
    results,
    isSearching,
    clear,
  };
}