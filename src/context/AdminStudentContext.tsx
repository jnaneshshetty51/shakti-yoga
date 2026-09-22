"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { StudentLookupItem } from "@/app/api/admin/students/lookup/route";

export type { StudentLookupItem };

interface AdminStudentContextType {
    selectedStudent: StudentLookupItem | null;
    setSelectedStudent: (student: StudentLookupItem | null) => void;
    recentStudents: StudentLookupItem[];
    clearSelectedStudent: () => void;
    markRecent: (student: StudentLookupItem) => void;
}

const AdminStudentContext = createContext<AdminStudentContextType | undefined>(undefined);

const STORAGE_KEY_SELECTED = "shakti_admin_selected_student";
const STORAGE_KEY_RECENTS = "shakti_admin_recent_students";
const MAX_RECENTS = 6;

export function AdminStudentProvider({ children }: { children: React.ReactNode }) {
    const [selectedStudent, setSelectedStudentState] = useState<StudentLookupItem | null>(null);
    const [recentStudents, setRecentStudents] = useState<StudentLookupItem[]>([]);

    // Initialize from localStorage on mount
    useEffect(() => {
        try {
            const savedSelected = localStorage.getItem(STORAGE_KEY_SELECTED);
            if (savedSelected) {
                // eslint-disable-next-line react-hooks/set-state-in-effect -- Client-only hydration from localStorage
                setSelectedStudentState(JSON.parse(savedSelected));
            }
            const savedRecents = localStorage.getItem(STORAGE_KEY_RECENTS);
            if (savedRecents) {
                setRecentStudents(JSON.parse(savedRecents));
            }
        } catch (e) {
            console.error("Failed to load student state from localStorage", e);
        }
    }, []);

    const markRecent = useCallback((student: StudentLookupItem) => {
        setRecentStudents((prev) => {
            const filtered = prev.filter((s) => s.id !== student.id);
            const updated = [student, ...filtered].slice(0, MAX_RECENTS);
            try {
                localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(updated));
            } catch (e) {
                console.error("Failed to save recents", e);
            }
            return updated;
        });
    }, []);

    const setSelectedStudent = useCallback((student: StudentLookupItem | null) => {
        setSelectedStudentState(student);
        try {
            if (student) {
                localStorage.setItem(STORAGE_KEY_SELECTED, JSON.stringify(student));
                markRecent(student);
            } else {
                localStorage.removeItem(STORAGE_KEY_SELECTED);
            }
        } catch (e) {
            console.error("Failed to update selected student in localStorage", e);
        }
    }, [markRecent]);

    const clearSelectedStudent = useCallback(() => {
        setSelectedStudent(null);
    }, [setSelectedStudent]);

    return (
        <AdminStudentContext.Provider
            value={{
                selectedStudent,
                setSelectedStudent,
                recentStudents,
                clearSelectedStudent,
                markRecent,
            }}
        >
            {children}
        </AdminStudentContext.Provider>
    );
}

export function useAdminStudent() {
    const context = useContext(AdminStudentContext);
    if (!context) {
        throw new Error("useAdminStudent must be used within an AdminStudentProvider");
    }
    return context;
}
