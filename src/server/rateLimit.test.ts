import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rateLimit";

/** A clock the test moves by hand (seam 10). */
function clock(start = 1_000_000) {
  let now = start;
  return { now: () => now, advance: (ms: number) => void (now += ms) };
}

describe("createRateLimiter (NFR-15)", () => {
  it("lets a caller use the whole capacity, then says no", () => {
    const limiter = createRateLimiter({ capacity: 3, perMinutes: 1 }, clock().now);

    expect([1, 2, 3].map(() => limiter("a").ok)).toEqual([true, true, true]);
    expect(limiter("a").ok).toBe(false);
  });

  it("tells a blocked caller how long to wait, in whole seconds, at least one", () => {
    const time = clock();
    const limiter = createRateLimiter({ capacity: 60, perMinutes: 1 }, time.now); // one token a second
    for (let i = 0; i < 60; i += 1) limiter("a");

    expect(limiter("a")).toEqual({ ok: false, retryAfterSec: 1 });
    time.advance(400);
    expect(limiter("a")).toEqual({ ok: false, retryAfterSec: 1 });
  });

  it("scales the wait to the bucket: a 6 per 10 minutes bucket refills a token every 100 seconds", () => {
    const time = clock();
    const limiter = createRateLimiter({ capacity: 6, perMinutes: 10 }, time.now);
    for (let i = 0; i < 6; i += 1) limiter("a");

    expect(limiter("a")).toEqual({ ok: false, retryAfterSec: 100 });
    time.advance(100_000);
    expect(limiter("a").ok).toBe(true);
    expect(limiter("a").ok).toBe(false);
  });

  it("keeps a separate bucket for every key", () => {
    const limiter = createRateLimiter({ capacity: 1, perMinutes: 1 }, clock().now);

    expect(limiter("a").ok).toBe(true);
    expect(limiter("a").ok).toBe(false);
    expect(limiter("b").ok).toBe(true);
  });

  it("never refills beyond the capacity", () => {
    const time = clock();
    const limiter = createRateLimiter({ capacity: 2, perMinutes: 1 }, time.now);
    limiter("a");
    time.advance(60 * 60_000);

    expect([limiter("a").ok, limiter("a").ok, limiter("a").ok]).toEqual([true, true, false]);
  });

  it("forgets idle callers rather than growing without bound", () => {
    const time = clock();
    const limiter = createRateLimiter({ capacity: 1, perMinutes: 1 }, time.now, { maxKeys: 3 });

    for (const key of ["a", "b", "c", "d", "e"]) limiter(key);

    // "a" was the oldest to go: it is treated as new again and gets a fresh bucket.
    expect(limiter("a").ok).toBe(true);
  });
});
