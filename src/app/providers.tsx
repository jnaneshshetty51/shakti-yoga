"use client";

import { AuthProvider } from "@/context/AuthContext";
import AuthDebug from "@/components/AuthDebug";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <AuthDebug />
        </AuthProvider>
    );
}
