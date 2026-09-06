"use client";

import { useAuth } from "@/context/AuthContext";

/**
 * Wrap a page whose API is gated by `requireSuperAdmin`. Staff admins can still
 * reach the URL (middleware only checks role === 'admin'), so show a clear notice
 * instead of a broken 403'd page.
 */
export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) return <div className="text-gray-500">Loading…</div>;

    if (user?.tier !== "super") {
        return (
            <div className="bg-white rounded-lg border border-gray-100 p-10 text-center max-w-lg mx-auto mt-8">
                <div className="text-4xl mb-3">🔒</div>
                <h1 className="font-serif text-2xl text-gray-800 mb-2">Super admins only</h1>
                <p className="text-gray-500">This section is restricted to super administrators.</p>
            </div>
        );
    }

    return <>{children}</>;
}
