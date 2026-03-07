import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Redis explicitly here, even though rate-limit.ts does too,
// to keep them decoupled. Fallback gracefully if not available.
export const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null;

/**
 * Get item from cache if Redis is available
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get<T>(key);
    return data;
  } catch (error) {
    console.error("Redis get error:", error);
    return null; // Fail open
  }
}

/**
 * Set item in cache with TTL if Redis is available
 */
export async function setCached(
  key: string,
  data: unknown,
  ttlSeconds: number,
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, data, { ex: ttlSeconds });
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

/**
 * Delete item from cache
 */
export async function invalidateCache(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Redis del error:", error);
  }
}

/**
 * Delete items by pattern using SCAN.
 * This should be used sparingly since SCAN can be slow if there are massive amounts of keys,
 * but for our use case (e.g. invalidating search:*), it's acceptable.
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    let cursor: string | number = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: pattern,
        count: 100,
      });
      cursor = nextCursor as string | number;

      if (keys && keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== 0 && cursor !== "0"); // Upstash sometimes returns string "0"
  } catch (error) {
    console.error("Redis scan/del error:", error);
  }
}
