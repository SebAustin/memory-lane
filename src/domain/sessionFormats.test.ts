import { describe, expect, it } from "vitest";
import { SESSION_FORMATS, wordCount } from "@/domain/sessionFormats";

describe("SESSION_FORMATS (PLAN section 3.2, FR-6)", () => {
  it("matches the PLAN table: early conversation 4-6 / <=3 / <=25 / >=1", () => {
    expect(SESSION_FORMATS.early).toEqual({
      format: "conversation",
      cues: { min: 4, max: 6 },
      maxPromptsPerCue: 3,
      maxWordsPerPrompt: 25,
      minSensoryActivities: 1,
    });
  });

  it("matches the PLAN table: middle mixed 4-6 / <=2 / <=18 / >=1", () => {
    expect(SESSION_FORMATS.middle).toEqual({
      format: "mixed",
      cues: { min: 4, max: 6 },
      maxPromptsPerCue: 2,
      maxWordsPerPrompt: 18,
      minSensoryActivities: 1,
    });
  });

  it("matches the PLAN table: late sensory 3-5 / <=1 / <=12 / >=2", () => {
    expect(SESSION_FORMATS.late).toEqual({
      format: "sensory",
      cues: { min: 3, max: 5 },
      maxPromptsPerCue: 1,
      maxWordsPerPrompt: 12,
      minSensoryActivities: 2,
    });
  });

  it("is frozen", () => {
    expect(Object.isFrozen(SESSION_FORMATS)).toBe(true);
    expect(Object.isFrozen(SESSION_FORMATS.late.cues)).toBe(true);
  });
});

describe("wordCount", () => {
  it("counts whitespace-separated words", () => {
    expect(wordCount("Tell me about the dances you went to.")).toBe(8);
    expect(wordCount("  spaced \n out  ")).toBe(2);
  });

  it("counts nothing in an empty string", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("   ")).toBe(0);
  });
});
