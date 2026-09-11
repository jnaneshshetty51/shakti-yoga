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
    "/dashboard/therapy/book": "/therapy",
    "/dashboard/therapy/notes": "/therapy",
    "/dashboard/refer": "/refer",
    "/dashboard/family": "/family",
    "/activity": "/activity",
  };
  return map[clean] ?? "/(tabs)";
}

/**
 * Map an incoming URL the OS handed the app — a Universal/App Link tap
 * (https://shaktiyoga.in/...) or the custom shaktiyoga:// scheme — to a route
 * in this app. `Linking.parse` normalises both forms to the same `path`
 * shape, so this just reuses `resolveNotificationPath`'s path-matching.
 */
export function resolveIncomingUrl(url: string): string {
  try {
    const { path } = Linking.parse(url);
    return resolveNotificationPath(path ? `/${path}` : null);
  } catch {
    return "/(tabs)";
  }
}
