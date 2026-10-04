import { describe, expect, it } from "vitest";
import { nameSimilarity } from "./nameSimilarity";

describe("nameSimilarity", () => {
  it("is 1 for names that differ only in case, accents, punctuation or a leading article", () => {
    expect(nameSimilarity("patsy cline", "Patsy Cline")).toBe(1);
    expect(nameSimilarity("Beyoncé", "beyonce")).toBe(1);
    expect(nameSimilarity("Run-DMC", "Run DMC")).toBe(1);
    expect(nameSimilarity("The Carpenters", "carpenters")).toBe(1);
    expect(nameSimilarity("Move Over, Darling", "move over darling")).toBe(1);
  });

  it("ignores word order, so a surname-first entry still matches", () => {
    expect(nameSimilarity("Cline, Patsy", "Patsy Cline")).toBe(1);
  });

  it("scores a one-letter typo high and a different name low", () => {
    expect(nameSimilarity("Patsy Clin", "Patsy Cline")).toBeGreaterThan(0.9);
    expect(nameSimilarity("Patsy Cline", "Loretta Lynn")).toBeLessThan(0.4);
  });

  it("scores a longer title that merely contains the query well below a confident match", () => {
    expect(nameSimilarity("Doris Day", "The Doris Day Show")).toBeLessThan(0.8);
  });

  it("is 0 when either side has no letters or digits", () => {
    expect(nameSimilarity("", "Patsy Cline")).toBe(0);
    expect(nameSimilarity("!!!", "???")).toBe(0);
  });

  it("is symmetric", () => {
    expect(nameSimilarity("Pillow Talk", "Pilow Talk")).toBe(nameSimilarity("Pilow Talk", "Pillow Talk"));
  });
});
