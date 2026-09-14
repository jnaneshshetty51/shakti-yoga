// Sliding-window-ish (fixed-window) rate limiter, shared across every
// instance via Redis when REDIS_URL is set. Falls back to an in-memory Map
// — correct for a single instance, silently under-enforces across more than
// one — when REDIS_URL is unset, or if Redis itself is unreachable for a
// given request (a rate-limiter outage should degrade limits, not take down
// login/signup/checkout).

import Redis from 'ioredis';

let redis: Redis | null = null;
if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
        // Fail fast per-command instead of buffering requests indefinitely
        // while disconnected — callers need a quick decision, not a hang.
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => Math.min(times * 200, 2000),
        lazyConnect: false,
    });
    redis.on('error', (err) => {
        console.error('[rate-limit] Redis connection error (falling back to in-memory until it recovers):', err.message);
    });
} else if (process.env.NODE_ENV === 'production') {
    console.warn(
        '[rate-limit] REDIS_URL is not set — rate limits are enforced per-process only. ' +
        'Fine for a single instance; each additional instance silently multiplies every limit. Set REDIS_URL before scaling out.',
    );
}

// Atomically increment the counter and, only on its first hit in this
// window, set its expiry — this is the same fixed-window semantics as the
// in-memory fallback (a bucket's window starts on first hit and doesn't
// reset until it expires), just shared across processes. A Lua script
// keeps INCR + PEXPIRE + PTTL atomic; a plain pipeline would not
// (Redis can interleave other clients' commands between pipelined calls).
const LUA_INCR_WITH_TTL = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`;

async function redisRateLimit(
    key: string,
    limit: number,
    windowMs: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const [count, ttlMs] = (await redis!.eval(LUA_INCR_WITH_TTL, 1, `ratelimit:${key}`, windowMs)) as [number, number];
    if (count > limit) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)) };
    }
    return { allowed: true, retryAfterSeconds: 0 };
}

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

function inMemoryRateLimit(
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

/**
 * Fixed-window rate limit, keyed by caller-supplied string (e.g. `login:${ip}`).
 * Shared across every instance via Redis when REDIS_URL is set; otherwise
 * (or if Redis errors on this call) falls back to a per-process in-memory
 * counter, which is exactly correct for a single instance.
 */
export async function rateLimit(
    key: string,
    limit: number,
    windowMs: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    if (redis) {
        try {
            return await redisRateLimit(key, limit, windowMs);
        } catch (err) {
            console.error('[rate-limit] Redis call failed, falling back to in-memory for this request:', err);
        }
    }
    return inMemoryRateLimit(key, limit, windowMs);
}

/** Best-effort client IP from the reverse proxy's X-Forwarded-For header. */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return 'unknown';
}
