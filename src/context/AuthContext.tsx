"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'visitor' | 'member_everyday' | 'member_therapy' | 'trial' | 'admin' | 'teacher';

interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
    country?: string;
    timezone?: string;
    avatarUrl?: string | null;
    credits: number;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(raw: Record<string, unknown>): User {
    return {
        id: String(raw.id),
        name: String(raw.name ?? ''),
        email: String(raw.email ?? ''),
        role: (raw.role as UserRole) ?? 'visitor',
        phone: raw.phone as string | undefined,
        country: raw.country as string | undefined,
        timezone: raw.timezone as string | undefined,
        avatarUrl: (raw.avatarUrl as string | null | undefined) ?? null,
        credits: typeof raw.credits === 'number' ? raw.credits : 0,
    };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const checkAuth = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            setUser(data.user ? normalizeUser(data.user) : null);
        } catch (error) {
            console.error('Check auth error:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = async (email: string, password: string) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            setUser(normalizeUser(data.user));

            if (data.user.role === 'admin' || data.user.role === 'SUPER_ADMIN' || data.user.role === 'STAFF_ADMIN') {
                router.push('/admin');
            } else {
                router.push('/dashboard');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            setUser(null);
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, refreshUser: checkAuth, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
