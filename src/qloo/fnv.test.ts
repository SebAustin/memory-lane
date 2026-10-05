import { describe, expect, it } from "vitest";
import { fnv1a, syntheticScore } from "@/qloo/fnv";

describe("fnv1a (32-bit)", () => {
  // Published FNV-1a test vectors: an independent source of truth.
  it.each([
    ["", 0x811c9dc5],
    ["a", 0xe40c292c],
    ["foobar", 0xbf9cf968],
  ])("hashes %j to the published vector", (text, expected) => {
    expect(fnv1a(text)).toBe(expected);
  });

  it("is stable and differs for different text", () => {
    expect(fnv1a("fx-artist-patsy-cline")).toBe(fnv1a("fx-artist-patsy-cline"));
    expect(fnv1a("a")).not.toBe(fnv1a("b"));
  });

  it("reads multi-byte characters as UTF-8", () => {
    expect(fnv1a("é")).toBe(fnv1a("é"));
    expect(fnv1a("é")).not.toBe(fnv1a("e"));
  });
});

describe("syntheticScore", () => {
  it("stays within 0.30 to 0.90 for any text", () => {
    for (let i = 0; i < 500; i += 1) {
      const score = syntheticScore(`entity-${i}|seed-${i * 7}`);
      expect(score).toBeGreaterThanOrEqual(0.3);
      expect(score).toBeLessThanOrEqual(0.9);
    }
  });

  it("is deterministic, and has two decimals", () => {
    expect(syntheticScore("x|y")).toBe(syntheticScore("x|y"));
    expect(Math.round(syntheticScore("x|y") * 100)).toBeCloseTo(syntheticScore("x|y") * 100, 8);
  });

  it("spreads over the range rather than clustering", () => {
    const scores = Array.from({ length: 200 }, (_, i) => syntheticScore(`k${i}`));
    expect(Math.max(...scores) - Math.min(...scores)).toBeGreaterThan(0.4);
  });

  it("maps the hash ends onto the range ends", () => {
    // fnv1a("") = 0x811c9dc5, so 2166136261 / 4294967295 = 0.5043 -> 0.30 + 0.60 * 0.5043 = 0.60
    expect(syntheticScore("")).toBe(0.6);
  });
});
