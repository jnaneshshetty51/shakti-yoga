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
  };
  return map[clean] ?? "/(tabs)";
}

/**
 * Map an incoming URL the OS handed the app — a Universal/App Link tap
 * (https://shaktiyoga.in/...) or the custom shaktiyoga:// scheme — to a route
 * in this app. `Linking.parse` normalises both forms to the same `path` +
 * `queryParams` shape.
 *
 * /r/:code and /reset-password carry information a plain path can't (the
 * referral code, the reset token) and both are meant for a signed-out
 * visitor, so they're handled explicitly here rather than through
 * resolveNotificationPath's simple path map.
 */
export function resolveIncomingUrl(url: string): string {
  try {
    const { path, queryParams } = Linking.parse(url);
    const clean = path ? `/${path}`.replace(/\/+$/, "") : "/";

    const referral = clean.match(/^\/r\/([^/]+)$/);
    if (referral) return `/(auth)/signup?ref=${encodeURIComponent(referral[1])}`;

    if (clean === "/reset-password") {
      const token = queryParams?.token;
      const raw = Array.isArray(token) ? token[0] : token;
      return raw ? `/(auth)/reset-password?token=${encodeURIComponent(raw)}` : "/(auth)/login";
    }

    return resolveNotificationPath(clean);
  } catch {
    return "/(tabs)";
  }
}

/** Paths meant for a signed-out visitor — navigate immediately instead of
 *  queuing behind login, since queuing would mean they'd have to already be
 *  logged in for a signup/reset link to ever go anywhere. */
export function isPublicAuthPath(path: string): boolean {
  return path.startsWith("/(auth)/");
}
