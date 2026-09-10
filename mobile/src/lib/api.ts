import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Base URL for the Shakti Yoga backend (the same Next.js app the website runs
 * on — mobile authenticates with `Authorization: Bearer <token>` instead of a
 * cookie; every other route is shared with the web dashboard).
 * Set EXPO_PUBLIC_API_URL in `.env` for local dev against `next dev`.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://shaktiyoga.in").replace(/\/+$/, "");

const TOKEN_KEY = "shakti_session_token";

let cachedToken: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Skip attaching the bearer token (login/register calls). */
  anonymous?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = opts.anonymous ? null : await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }

  // Some routes (e.g. /api/auth/me) roll the session forward and hand back a
  // fresh token — the app has no cookie jar, so it must persist it itself.
  if (data && typeof data.token === "string") {
    void setToken(data.token);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
