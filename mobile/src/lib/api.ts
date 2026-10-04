import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Base URL for the Shakti Yoga backend (the same Next.js app the website runs
 * on — mobile authenticates with `Authorization: Bearer <token>` instead of a
 * cookie; every other route is shared with the web dashboard).
 * Set EXPO_PUBLIC_API_URL in `.env` for local dev against `next dev`.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://shaktiyoga.in").replace(/\/+$/, "");

const TOKEN_KEY = "shakti_session_token";

let cachedToken: string | null | undefined;

// expo-secure-store has no web implementation (there's no OS keychain to wrap)
// — the web build falls back to localStorage, same trust model as any other
// bearer-token web app. Native platforms keep using the OS keychain.
async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function storageDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await storageGet(TOKEN_KEY);
  return cachedToken;
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (token) await storageSet(TOKEN_KEY, token);
  else await storageDelete(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  /** The parsed response body, so callers can read fields beyond `error`. */
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Called on a 401 from an authenticated request — i.e. the token this app is
 * holding has been revoked server-side (password reset, admin deactivation)
 * mid-session, not just "this login attempt had the wrong password." Set by
 * AuthContext so it can clear the session; without this, every screen using
 * this token just showed the raw "Unauthorized" error string forever instead
 * of routing back to login.
 */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError("The request timed out. Check your connection and try again.", 0);
    }
    throw new ApiError("You appear to be offline. Check your connection and try again.", 0);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  // A gateway/proxy error (502, etc.) or an HTML error page isn't JSON — don't
  // let JSON.parse's exception replace a clear "server error" with a raw
  // parser message.
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError(
        res.ok ? "Unexpected response from the server." : `Something went wrong (${res.status}). Please try again.`,
        res.status,
      );
    }
  }

  if (!res.ok) {
    if (res.status === 401 && !opts.anonymous) onUnauthorized?.();
    throw new ApiError((data?.error as string) || `Request failed (${res.status})`, res.status, data);
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
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const token = await getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers,
        body: formData,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ApiError("The upload timed out. Check your connection and try again.", 0);
      }
      throw new ApiError("Upload failed. Check your connection and try again.", 0);
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    let data: Record<string, unknown> = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new ApiError(
          res.ok ? "Unexpected response from server." : `Upload failed (${res.status}).`,
          res.status,
        );
      }
    }

    if (!res.ok) {
      if (res.status === 401) onUnauthorized?.();
      throw new ApiError((data?.error as string) || `Upload failed (${res.status})`, res.status, data);
    }

    return data as T;
  },
};

function guessImageMime(uri: string): string {
  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

/**
 * Appends a locally-picked image to a FormData "file" part. Native RN has a fetch/FormData
 * polyfill that knows how to read the special {uri,type,name} object; the web platform (now
 * supported via react-native-web) has no such polyfill and needs a real Blob, fetched from
 * the local blob:/data: URI first.
 */
export async function appendImageFile(
  formData: FormData,
  field: string,
  uri: string,
  mimeType: string | null | undefined,
  filename: string,
): Promise<void> {
  const type = mimeType || guessImageMime(uri);
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    formData.append(field, blob, filename);
  } else {
    formData.append(field, { uri, type, name: filename } as unknown as Blob);
  }
}

