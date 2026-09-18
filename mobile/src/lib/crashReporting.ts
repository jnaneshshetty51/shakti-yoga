import * as Sentry from "@sentry/react-native";

/**
 * Crash/error reporting via Sentry. Mirrors src/lib/purchases.ts's pattern
 * exactly: requires a real DSN before doing anything; until then,
 * initCrashReporting() logs a warning and every other function here is a
 * no-op — the app keeps working, errors just aren't reported anywhere but
 * the device's own console.
 *
 * Requires a real DSN before this reports anything: create a project at
 * sentry.io (React Native platform), then set EXPO_PUBLIC_SENTRY_DSN in
 * `.env` to its DSN. See mobile/README.md.
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || "";

let configured = false;

export function initCrashReporting(): void {
  if (configured) return;
  if (!DSN) {
    console.warn(
      "[crashReporting] No Sentry DSN configured — crash reporting is disabled. " +
        "Set EXPO_PUBLIC_SENTRY_DSN. See mobile/README.md.",
    );
    return;
  }
  Sentry.init({
    dsn: DSN,
    // Errors are still useful without performance tracing; keep the default
    // footprint small until there's a reason to raise it.
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    enabled: !__DEV__, // never spam a shared Sentry project with local dev noise
    debug: false,
  });
  configured = true;
}

export function crashReportingReady(): boolean {
  return configured;
}

/** Report a caught error (e.g. from the top-level ErrorBoundary, or a try/catch worth knowing about in production). No-ops silently if not configured. */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!configured) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/** Associate subsequent crash reports with this user — call right after login/register, same lifecycle as loginPurchases(). */
export function setCrashReportingUser(userId: string): void {
  if (!configured) return;
  Sentry.setUser({ id: userId });
}

/** Call on logout — same lifecycle as logoutPurchases(). */
export function clearCrashReportingUser(): void {
  if (!configured) return;
  Sentry.setUser(null);
}
