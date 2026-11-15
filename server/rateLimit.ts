export interface InMemoryRateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  maxEntries?: number;
  now?: () => number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Process-local limiter for low-volume protection. Memory stays bounded, but
 * the state is not shared between serverless instances and is not a global quota.
 */
export function createInMemoryRateLimiter(options: InMemoryRateLimiterOptions = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const maxRequests = options.maxRequests ?? 8;
  const maxEntries = options.maxEntries ?? 10_000;
  const now = options.now ?? Date.now;

  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new RangeError("windowMs must be a positive finite number.");
  }
  if (!Number.isInteger(maxRequests) || maxRequests < 1) {
    throw new RangeError("maxRequests must be a positive integer.");
  }
  if (!Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new RangeError("maxEntries must be a positive integer.");
  }

  const entries = new Map<string, RateLimitEntry>();
  const allowed = (count: number): RateLimitDecision => ({
    allowed: true,
    remaining: Math.max(0, maxRequests - count),
    retryAfterSeconds: 0
  });

  return {
    consume(key: string): RateLimitDecision {
      if (typeof key !== "string" || key.length === 0) {
        throw new TypeError("A non-empty rate-limit key is required.");
      }

      const timestamp = now();
      const current = entries.get(key);
      if (current && current.resetAt > timestamp) {
        entries.delete(key);
        entries.set(key, current);
        if (current.count >= maxRequests) {
          return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - timestamp) / 1000))
          };
        }
        current.count += 1;
        return allowed(current.count);
      }
      if (current) entries.delete(key);

      if (entries.size >= maxEntries) {
        for (const [entryKey, entry] of entries) {
          if (entry.resetAt <= timestamp) entries.delete(entryKey);
        }
        if (entries.size >= maxEntries) {
          const oldestKey = entries.keys().next().value;
          if (oldestKey !== undefined) entries.delete(oldestKey);
        }
      }

      entries.set(key, { count: 1, resetAt: timestamp + windowMs });
      return allowed(1);
    }
  };
}
