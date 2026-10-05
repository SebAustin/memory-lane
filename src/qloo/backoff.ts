import "server-only";

/**
 * Retry timing for the Qloo HTTP client (PLAN 5.2, NFR-18). Pure: randomness
 * and the clock are passed in, so tests are deterministic (seam 3).
 */

export interface RetryPolicy {
  /** Retries after the first attempt (so up to `1 + maxRetries` requests). */
  readonly maxRetries: number;
  readonly baseMs: number;
  /** Cap on a single wait, including a server's `Retry-After`. */
  readonly maxDelayMs: number;
  /** Each attempt is abandoned after this long. */
  readonly attemptTimeoutMs: number;
}

export const DEFAULT_RETRY: RetryPolicy = {
  maxRetries: 3,
  baseMs: 250,
  maxDelayMs: 2000,
  attemptTimeoutMs: 8000,
};

/**
 * How long to wait before retry number `attempt` (zero-based): full jitter,
 * `min(maxDelay, base * 2^attempt) * rnd()`. A usable `Retry-After` (seconds)
 * replaces the jitter but is still capped at `maxDelayMs`.
 */
export function backoffDelay(
  attempt: number,
  policy: RetryPolicy,
  rnd: () => number,
  retryAfterSec?: number,
): number {
  if (retryAfterSec !== undefined && Number.isFinite(retryAfterSec) && retryAfterSec >= 0) {
    return Math.min(policy.maxDelayMs, Math.round(retryAfterSec * 1000));
  }
  const ceiling = Math.min(policy.maxDelayMs, policy.baseMs * 2 ** Math.min(attempt, 30));
  return Math.round(ceiling * rnd());
}

/** Reads a `Retry-After` header: whole seconds, or an HTTP date (seconds from `nowMs`). Undefined when unusable. */
export function parseRetryAfter(header: string | null, nowMs: number): number | undefined {
  const text = header?.trim();
  if (text === undefined || text === "") return undefined;
  if (/^\d+$/.test(text)) return Number(text);
  // `Date.parse` accepts odd numeric strings ("-1"); an HTTP date always has a month name.
  const date = /[a-z]/i.test(text) ? Date.parse(text) : Number.NaN;
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - nowMs) / 1000));
}
