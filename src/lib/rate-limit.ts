// In-memory sliding-window rate limiter. Fine for this app's single PM2
// instance; would need a shared store (e.g. Redis) behind multiple instances.

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
