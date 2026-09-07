/**
 * Server-side PostHog capture over the HTTP API — no SDK, fire-and-forget.
 * Set POSTHOG_KEY (project API key) to turn it on; POSTHOG_HOST defaults to
 * PostHog Cloud US. Without the key this is a no-op and the app still records
 * events to the local AnalyticsEvent table via lib/analytics.
 */

const KEY = process.env.POSTHOG_KEY;
const HOST = (process.env.POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '');

export function posthogAvailable(): boolean {
    return !!KEY;
}

export function posthogCapture(
    distinctId: string,
    event: string,
    properties?: Record<string, unknown>,
): void {
    if (!KEY) return;
    void fetch(`${HOST}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            api_key: KEY,
            event,
            distinct_id: distinctId || 'anonymous',
            properties: { ...properties, $lib: 'shakti-server' },
            timestamp: new Date().toISOString(),
        }),
        // don't hold the request open on PostHog
        keepalive: true,
    }).catch(() => {});
}

/** Attach durable user traits to a person (plan, role, signup date, …). */
export function posthogIdentify(distinctId: string, traits: Record<string, unknown>): void {
    if (!KEY || !distinctId) return;
    void fetch(`${HOST}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            api_key: KEY,
            event: '$identify',
            distinct_id: distinctId,
            properties: { $set: traits, $lib: 'shakti-server' },
            timestamp: new Date().toISOString(),
        }),
        keepalive: true,
    }).catch(() => {});
}
