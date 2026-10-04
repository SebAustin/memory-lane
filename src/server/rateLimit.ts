import "server-only";
import type { RateLimit } from "@/config/limits";

/**
 * Per-instance token buckets (PLAN 3.4, NFR-15). A bucket holds `capacity`
 * tokens and refills evenly over `perMinutes`; each request takes one. The
 * limits are approximate by design: each serverless instance counts on its own
 * (PLAN 2), so the WAF rule and prepaid credits bound the worst case.
 */

export interface RateLimitResult {
  readonly ok: boolean;
  /** Whole seconds until a token is available again; 0 when `ok`. */
  readonly retryAfterSec: number;
}

export type RateLimiter = (key: string) => RateLimitResult;

interface Bucket {
  readonly tokens: number;
  readonly at: number;
}

const DEFAULT_MAX_KEYS = 10_000;

export function createRateLimiter(
  { capacity, perMinutes }: RateLimit,
  now: () => number = Date.now,
  { maxKeys = DEFAULT_MAX_KEYS }: { readonly maxKeys?: number } = {},
): RateLimiter {
  const perMs = capacity / (perMinutes * 60_000);
  // Insertion order doubles as recency: a touched key is re-inserted last.
  const buckets = new Map<string, Bucket>();

  return (key) => {
    const at = now();
    const previous = buckets.get(key) ?? { tokens: capacity, at };
    const tokens = Math.min(capacity, previous.tokens + (at - previous.at) * perMs);

    buckets.delete(key);
    const ok = tokens >= 1;
    buckets.set(key, { tokens: ok ? tokens - 1 : tokens, at });
    while (buckets.size > maxKeys) buckets.delete(buckets.keys().next().value as string);

    return ok
      ? { ok, retryAfterSec: 0 }
      : { ok, retryAfterSec: Math.max(1, Math.ceil((1 - tokens) / perMs / 1000)) };
  };
}
