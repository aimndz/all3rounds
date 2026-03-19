import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * PRODUCTION RATE LIMITER (Upstash Redis)
 * ---------------------------------------
 * This works across all Vercel serverless instances by using a central Redis store.
 *
 * LOCAL FALLBACK: If UPSTASH_REDIS_REST_URL is missing, it falls back to
 * a simple in-memory Map (for local development).
 */

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Redis only if keys exist
const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null;

export const RATE_LIMITS = {
  // General browsing / API access
  anonymous: { maxRequests: 15, window: "60 s" },
  authenticated: { maxRequests: 60, window: "60 s" },
  directory: { maxRequests: 100, window: "60 s" },

  // Search (heavier DB queries)
  search: { maxRequests: 5, window: "60 s" },

  // Editing / Mutations (admin actions)
  edit: { maxRequests: 100, window: "1 h" },
  add_line: { maxRequests: 50, window: "1 h" },
} as const;

// Create limiters for each type if Redis is available
const limiters = redis
  ? {
      anonymous: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.anonymous.maxRequests,
          RATE_LIMITS.anonymous.window,
        ),
      }),
      authenticated: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.authenticated.maxRequests,
          RATE_LIMITS.authenticated.window,
        ),
      }),
      directory: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.directory.maxRequests,
          RATE_LIMITS.directory.window,
        ),
      }),
      search: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.search.maxRequests,
          RATE_LIMITS.search.window,
        ),
      }),
      edit: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.edit.maxRequests,
          RATE_LIMITS.edit.window,
        ),
      }),
      add_line: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.add_line.maxRequests,
          RATE_LIMITS.add_line.window,
        ),
      }),
    }
  : null;

// --- LOCAL FALLBACK LOGIC ---
const localRateMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Main function to check rate limits.
 */
export async function checkRateLimit(
  key: string,
  type: keyof typeof RATE_LIMITS,
): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  reset: number;
}> {
  const config = RATE_LIMITS[type];
  const windowMs = config.window.includes("h") ? 60 * 60 * 1000 : 60 * 1000;

  // USE PRODUCTION REDIS
  if (limiters && limiters[type]) {
    try {
      const { success, remaining, limit, reset } =
        await limiters[type].limit(key);
      return { allowed: success, remaining, limit, reset };
    } catch (error) {
      console.error("Upstash Redis error:", error);
    }
  }

  // USE LOCAL MEMORY FALLBACK
  const now = Date.now();
  const entry = localRateMap.get(`${type}:${key}`);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    localRateMap.set(`${type}:${key}`, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      limit: config.maxRequests,
      reset: resetAt,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      limit: config.maxRequests,
      reset: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    limit: config.maxRequests,
    reset: entry.resetAt,
  };
}

/**
 * Helper to generate standard Rate Limit headers
 */
export function getRateLimitHeaders(res: {
  remaining: number;
  limit: number;
  reset: number;
}) {
  return {
    "X-RateLimit-Limit": res.limit.toString(),
    "X-RateLimit-Remaining": res.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(res.reset / 1000).toString(),
  };
}
