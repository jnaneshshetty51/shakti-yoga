"use client";

import { useAuth, UserRole } from "@/context/AuthContext";
import { useState } from "react";

export default function AuthDebug() {
    const { user, login, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white px-3 py-2 rounded-full shadow-lg text-xs font-bold uppercase tracking-widest hover:bg-gray-700 transition-all"
            >
                Debug Auth
            </button>
        );
    }

    const roles: { label: string; value: UserRole }[] = [
        { label: "Visitor (Logout)", value: "visitor" },
        { label: "Trial User", value: "trial" },
        { label: "Member (Everyday)", value: "member_everyday" },
        { label: "Member (Therapy)", value: "member_therapy" },
        { label: "Admin", value: "admin" },
    ];

    return (
        <div className="fixed bottom-4 right-4 z-50 bg-white p-4 rounded-lg shadow-xl border border-gray-200 w-64">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm text-gray-800">Auth Debugger</h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
                <p><span className="font-bold">Current Role:</span> {user?.role || "Visitor"}</p>
            </div>

            <div className="space-y-2">
                {roles.map((role) => (
                    <button
                        key={role.value}
                        onClick={() => role.value === 'visitor' ? logout() : console.log('Mock login no longer supported', role.value)}
                        className={`w-full text-left px-3 py-2 text-xs rounded transition-colors ${(user?.role === role.value) || (!user && role.value === 'visitor')
                            ? "bg-primary text-white font-bold"
                            : "hover:bg-gray-100 text-gray-700"
                            }`}
                    >
                        {role.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
