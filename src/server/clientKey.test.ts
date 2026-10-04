import { describe, expect, it } from "vitest";
import { createClientKey } from "./clientKey";

const request = (forwardedFor?: string) =>
  new Request("http://localhost/api/resolve", {
    method: "POST",
    headers: forwardedFor === undefined ? {} : { "x-forwarded-for": forwardedFor },
  });

const DAY_1 = Date.UTC(2026, 9, 3, 12);
const DAY_2 = Date.UTC(2026, 9, 4, 12);

describe("clientKey (NFR-15, PLAN 9)", () => {
  it("is the same for the same address on the same day, and differs between addresses", () => {
    const key = createClientKey({ now: () => DAY_1, secret: "s" });

    expect(key(request("203.0.113.7"))).toBe(key(request("203.0.113.7")));
    expect(key(request("203.0.113.7"))).not.toBe(key(request("203.0.113.8")));
  });

  it("uses only the first address in x-forwarded-for", () => {
    const key = createClientKey({ now: () => DAY_1, secret: "s" });

    expect(key(request("203.0.113.7, 10.0.0.1, 10.0.0.2"))).toBe(key(request("203.0.113.7")));
  });

  it("changes every UTC day, so a key cannot follow someone across days", () => {
    let now = DAY_1;
    const key = createClientKey({ now: () => now, secret: "s" });
    const today = key(request("203.0.113.7"));

    now = DAY_2;

    expect(key(request("203.0.113.7"))).not.toBe(today);
  });

  it("never contains the raw address, and is a fixed-length hex digest", () => {
    const value = createClientKey({ now: () => DAY_1, secret: "s" })(request("203.0.113.7"));

    expect(value).toMatch(/^[0-9a-f]{64}$/);
    expect(value).not.toContain("203");
  });

  it("depends on the secret, so the daily salt cannot be recomputed from the date alone", () => {
    const a = createClientKey({ now: () => DAY_1, secret: "one" })(request("203.0.113.7"));
    const b = createClientKey({ now: () => DAY_1, secret: "two" })(request("203.0.113.7"));

    expect(a).not.toBe(b);
  });

  it("puts a request with no usable address in one shared bucket instead of failing", () => {
    const key = createClientKey({ now: () => DAY_1, secret: "s" });

    expect(key(request())).toBe(key(request("")));
    expect(key(request())).toBe(key(request("   ")));
  });
});
