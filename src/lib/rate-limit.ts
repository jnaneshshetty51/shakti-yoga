// In-memory sliding-window rate limiter. Fine for this app's single PM2
// instance; would need a shared store (e.g. Redis) behind multiple instances.
//
// TODO(scale-out): every caller of rateLimit() below (auth, contact, checkout,
// corporate/retreat enquiries, etc.) silently stops throttling the moment this
// runs behind more than one instance — each process gets its own independent
// bucket, so a limit of N requests becomes N-per-instance with no warning.
// Before deploying more than one instance, replace the Map below with a
// shared store (Redis INCR + TTL is the standard pattern) behind the same
// rateLimit() signature so call sites don't need to change.

interface Bucket {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so long-running uptime doesn't leak
// memory for one-off/attacker IPs that never come back.
setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
        if (now > bucket.resetAt) buckets.delete(key);
    }
}, 10 * 60 * 1000).unref();

/**
 * Sliding-window rate limit, keyed by caller-supplied string (e.g. `login:${ip}`).
 *
 * ⚠️ In-memory only — the limit is per-process. Behind more than one server
 * instance, each instance enforces its own independent copy of `limit`,
 * silently multiplying the real effective limit by the instance count with
 * no error or log line to notice it by. Safe today (single PM2 instance);
 * revisit before horizontal scaling — see the TODO above this function.
 */
export function rateLimit(
    key: string,
    limit: number,
    windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
    }

    if (bucket.count >= limit) {
        return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
    }

    bucket.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP from the reverse proxy's X-Forwarded-For header. */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return 'unknown';
}
