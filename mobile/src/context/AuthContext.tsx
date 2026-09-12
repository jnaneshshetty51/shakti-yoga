import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, getToken, setToken, ApiError } from "@/lib/api";
import { registerForPush, unregisterForPush } from "@/lib/push";
import { loginPurchases, logoutPurchases } from "@/lib/purchases";

export type UserRole =
  | "visitor"
  | "member_everyday"
  | "member_starter"
  | "member_therapy"
  | "trial"
  | "admin"
  | "teacher";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  country?: string | null;
  timezone?: string;
  avatarUrl?: string | null;
  credits: number;
  tier?: "super" | "staff" | null;
}

interface AuthResponse {
  token: string;
  user: AppUser;
}

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fields: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    country?: string;
    phone?: string;
    referralCode?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restore = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const data = await api.get<{ user: AppUser | null }>("/api/auth/me");
      setUser(data.user);
      if (data.user) {
        void registerForPush();
        void loginPurchases(data.user.id);
      } else {
        await setToken(null);
      }
    } catch {
      // Network hiccup — keep the token, try again next launch rather than
      // logging the user out for a flaky connection.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restore();
  }, [restore]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>("/api/auth/mobile/login", { email, password }, { anonymous: true });
    await setToken(data.token);
    setUser(data.user);
    void registerForPush();
    void loginPurchases(data.user.id);
  }, []);

  const register = useCallback(async (fields: Parameters<AuthContextValue["register"]>[0]) => {
    const data = await api.post<AuthResponse>("/api/auth/mobile/register", fields, { anonymous: true });
    await setToken(data.token);
    setUser(data.user);
    void registerForPush();
    void loginPurchases(data.user.id);
  }, []);

  const logout = useCallback(async () => {
    await unregisterForPush(); // needs the bearer token — must run before setToken(null)
    await setToken(null);
    setUser(null);
    void logoutPurchases();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: AppUser | null }>("/api/auth/me");
      setUser(data.user);
    } catch {
      /* keep last-known user on a transient failure */
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export { ApiError };
