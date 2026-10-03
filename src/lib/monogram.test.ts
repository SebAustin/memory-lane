import { describe, expect, it } from "vitest";
import { MONOGRAM_TONES, initialsOf, toneOf } from "@/lib/monogram";

describe("initialsOf", () => {
  it.each([
    ["Patsy Cline", "PC"],
    ["Pillow Talk", "PT"],
    ["Elvis", "E"],
    ["Jerry Lee Lewis", "JL"],
    ["  doris   day ", "DD"],
    ["Move Over, Darling", "MO"],
    ["Beyoncé Knowles", "BK"],
    ["Éric Clapton", "ÉC"],
  ])("turns %j into %j", (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });

  it("skips a leading article", () => {
    expect(initialsOf("The Everly Brothers")).toBe("EB");
  });

  it("ignores punctuation and digits and falls back to a safe glyph", () => {
    expect(initialsOf("(500) Days")).toBe("D");
    expect(initialsOf("!!!")).toBe("?");
    expect(initialsOf("")).toBe("?");
  });
});

describe("toneOf", () => {
  it("is stable for the same name", () => {
    expect(toneOf("Patsy Cline")).toBe(toneOf("Patsy Cline"));
  });

  it("always lands inside the palette", () => {
    for (const name of ["a", "Patsy Cline", "Pillow Talk", "ZZZ", "😀", ""]) {
      const tone = toneOf(name);
      expect(Number.isInteger(tone)).toBe(true);
      expect(tone).toBeGreaterThanOrEqual(0);
      expect(tone).toBeLessThan(MONOGRAM_TONES);
    }
  });

  it("spreads different names over more than one tone", () => {
    const names = ["Patsy Cline", "Pillow Talk", "Loretta Lynn", "Brenda Lee", "Elvis Presley", "Roy Orbison"];
    expect(new Set(names.map(toneOf)).size).toBeGreaterThan(2);
  });
});
