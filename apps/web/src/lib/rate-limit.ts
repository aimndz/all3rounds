/**
 * Simple in-memory rate limiter.
 * No Redis needed — works on Vercel serverless (per-instance).
 * For production at scale, swap to Upstash Redis rate limiting.
 */

const rateMap = new Map<string, { count: number; resetAt: number }>();

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

export const RATE_LIMITS = {
  anonymous: { maxRequests: 20, windowMs: 60 * 1000 } as RateLimitConfig,
  authenticated: { maxRequests: 60, windowMs: 60 * 1000 } as RateLimitConfig,
  edit: { maxRequests: 10, windowMs: 60 * 60 * 1000 } as RateLimitConfig,
};

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count };
}

// Clean up stale entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateMap) {
      if (now > entry.resetAt) {
        rateMap.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);
