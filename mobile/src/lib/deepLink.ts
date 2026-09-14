import * as Linking from "expo-linking";

/**
 * Map a backend notification `data.url` (web-style paths like "/post/abc" or
 * "/dashboard/billing") to a route in this app. Everything unknown falls back
 * to the home tab.
 */
export function resolveNotificationPath(url?: string | null): string {
  if (!url) return "/(tabs)";
  const clean = url.split(/[?#]/)[0].replace(/\/+$/, "") || "/";

  const content = clean.match(/^\/(?:reel|post|content|announcement)\/([^/]+)$/);
  if (content) return `/content/${content[1]}`;

  const practice = clean.match(/^\/practice\/([^/]+)$/);
  if (practice) return `/practice/${practice[1]}`;

  const map: Record<string, string> = {
    "/dashboard": "/(tabs)",
    "/dashboard/classes": "/(tabs)/classes",
    "/dashboard/progress": "/(tabs)/progress",
    "/dashboard/billing": "/membership",
    "/dashboard/support": "/support",
    "/dashboard/certificates": "/certificates",
    "/dashboard/activity": "/activity",
    "/dashboard/therapy": "/therapy",
    "/dashboard/therapy/book": "/book-consult",
    "/dashboard/therapy/notes": "/therapy",
    "/dashboard/refer": "/refer",
    "/dashboard/family": "/family",
    "/activity": "/activity",
    "/reset-password": "/(auth)/reset-password",
  };
  return map[clean] ?? "/(tabs)";
}

/**
 * Map an incoming URL the OS handed the app — a Universal/App Link tap
 * (https://shaktiyoga.in/...) or the custom shaktiyoga:// scheme — to a route
 * in this app. `Linking.parse` normalises both forms to the same `path`
 * shape, so this mostly reuses `resolveNotificationPath`'s path-matching —
 * except the password-reset link mailed to users, whose `token` query param
 * must survive the trip, so it's re-attached onto the resolved path here
 * (the caller in _layout.tsx just does `router.push(path)` with the result).
 */
export function resolveIncomingUrl(url: string): string {
  try {
    const { path, queryParams } = Linking.parse(url);
    const resolved = resolveNotificationPath(path ? `/${path}` : null);

    if (resolved === "/(auth)/reset-password") {
      const token = queryParams?.token;
      const raw = Array.isArray(token) ? token[0] : token;
      if (raw) return `${resolved}?token=${encodeURIComponent(raw)}`;
    }

    return resolved;
  } catch {
    return "/(tabs)";
  }
}
