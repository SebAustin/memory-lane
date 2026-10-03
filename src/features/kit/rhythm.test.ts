import { describe, expect, it } from "vitest";
import { cardRhythm } from "@/features/kit/rhythm";

describe("cardRhythm", () => {
  it("is deterministic for an index", () => {
    expect(cardRhythm(4)).toEqual(cardRhythm(4));
  });

  it("makes the first card the featured one, and only the first", () => {
    expect(cardRhythm(0).featured).toBe(true);
    const featured = Array.from({ length: 15 }, (_, i) => cardRhythm(i)).filter((r) => r.featured);
    expect(featured).toHaveLength(1);
  });

  it("varies tilt so the grid never reads as uniform", () => {
    const tilts = new Set(Array.from({ length: 15 }, (_, i) => cardRhythm(i).tilt));
    expect(tilts).toEqual(new Set(["a", "b", "c", "none"]));
  });

  it("never gives two neighbours the same tilt", () => {
    for (let i = 1; i < 30; i += 1) {
      expect(cardRhythm(i).tilt).not.toBe(cardRhythm(i - 1).tilt);
    }
  });

  it("tapes some cards but not most", () => {
    const taped = Array.from({ length: 15 }, (_, i) => cardRhythm(i)).filter((r) => r.taped);
    expect(taped.length).toBeGreaterThan(0);
    expect(taped.length).toBeLessThan(8);
  });
});
