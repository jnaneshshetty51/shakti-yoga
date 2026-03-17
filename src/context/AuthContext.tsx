"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'visitor' | 'member_everyday' | 'member_therapy' | 'trial' | 'admin';

interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
    country?: string;
    timezone?: string;
    credits?: number; // Kept for compatibility, though not yet in DB
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isLoading: boolean;
    useCredit: () => boolean; // Kept for compatibility
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (data.user) {
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Check auth error:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

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

            setUser(data.user);

            // Redirect based on role
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

    const useCredit = () => {
        // Placeholder for now as credits are not in DB yet
        if (user && user.credits && user.credits > 0) {
            const newCredits = user.credits - 1;
            setUser({ ...user, credits: newCredits });
            return true;
        }
        return false;
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading, useCredit }}>
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
