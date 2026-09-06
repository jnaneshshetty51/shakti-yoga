"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { redirectTargetFromLocation } from '@/lib/nav';

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
    /** Admin tier — only set when role === 'admin'. */
    tier?: 'super' | 'staff' | null;
}

export interface RegisterInput {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    country?: string;
    timezone?: string;
    phone?: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string, remember?: boolean) => Promise<void>;
    register: (input: RegisterInput) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Where a role lands after login when there's no explicit ?from= target. */
export function roleHome(role: UserRole): string {
    if (role === 'admin') return '/admin';
    if (role === 'teacher') return '/teacher';
    return '/dashboard';
}

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
        tier: raw.tier === 'super' || raw.tier === 'staff' ? raw.tier : null,
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

    const login = async (email: string, password: string, remember = false) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, remember }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Login failed');
        }

        const loggedIn = normalizeUser(data.user);
        setUser(loggedIn);

        // Honour ?from= / ?redirect= (same-origin paths only), else role home.
        router.push(redirectTargetFromLocation() ?? roleHome(loggedIn.role));
    };

    const register = async (input: RegisterInput) => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Sign up failed');
        }

        setUser(normalizeUser(data.user));
        // A user who signed up mid-funnel (trial / checkout) returns there;
        // otherwise the personalization step.
        router.push(redirectTargetFromLocation() ?? '/onboarding');
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            router.push('/login');
            router.refresh();
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, refreshUser: checkAuth, isLoading }}>
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
