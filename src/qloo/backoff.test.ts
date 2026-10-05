import { describe, expect, it } from "vitest";
import { backoffDelay, DEFAULT_RETRY, parseRetryAfter } from "@/qloo/backoff";

describe("backoffDelay (full jitter, PLAN 5.2)", () => {
  it("is min(2000, 250 * 2^n) times a random fraction", () => {
    expect(backoffDelay(0, DEFAULT_RETRY, () => 1)).toBe(250);
    expect(backoffDelay(1, DEFAULT_RETRY, () => 1)).toBe(500);
    expect(backoffDelay(2, DEFAULT_RETRY, () => 1)).toBe(1000);
    expect(backoffDelay(0, DEFAULT_RETRY, () => 0.5)).toBe(125);
    expect(backoffDelay(2, DEFAULT_RETRY, () => 0)).toBe(0);
  });

  it("never exceeds the 2 s cap, however many attempts", () => {
    expect(backoffDelay(3, DEFAULT_RETRY, () => 1)).toBe(2000);
    expect(backoffDelay(30, DEFAULT_RETRY, () => 1)).toBe(2000);
  });

  it("honours Retry-After, but never waits more than 2 s", () => {
    expect(backoffDelay(0, DEFAULT_RETRY, () => 0.1, 1)).toBe(1000);
    expect(backoffDelay(0, DEFAULT_RETRY, () => 0.1, 30)).toBe(2000);
    expect(backoffDelay(0, DEFAULT_RETRY, () => 0.1, 0)).toBe(0);
  });

  it("ignores a Retry-After that is not a usable number", () => {
    expect(backoffDelay(0, DEFAULT_RETRY, () => 1, Number.NaN)).toBe(250);
    expect(backoffDelay(0, DEFAULT_RETRY, () => 1, -4)).toBe(250);
  });
});

describe("parseRetryAfter", () => {
  const NOW = Date.parse("2026-10-04T12:00:00Z");

  it("reads whole seconds", () => {
    expect(parseRetryAfter("3", NOW)).toBe(3);
    expect(parseRetryAfter(" 0 ", NOW)).toBe(0);
  });

  it("reads an HTTP date as seconds from now", () => {
    expect(parseRetryAfter("Sun, 04 Oct 2026 12:00:02 GMT", NOW)).toBe(2);
  });

  it("treats a date in the past as no wait", () => {
    expect(parseRetryAfter("Sun, 04 Oct 2026 11:00:00 GMT", NOW)).toBe(0);
  });

  it("returns undefined when absent or unreadable", () => {
    expect(parseRetryAfter(null, NOW)).toBeUndefined();
    expect(parseRetryAfter("soon", NOW)).toBeUndefined();
    expect(parseRetryAfter("-1", NOW)).toBeUndefined();
  });
});
