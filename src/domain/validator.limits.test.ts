import { describe, expect, it } from "vitest";
import { KitDraft } from "@/contracts";
import { LIMITS } from "@/domain/validator/limits";
import { FOUR_CLEAN, PAD_ONE, PAD_TWO, cue, session } from "@/domain/validator/testkit";
import type { DraftSession } from "@/domain/validator/types";

/** Whether the Kit contract accepts a Session built by `build`. */
const accepts = (build: (text: string) => DraftSession, length: number): boolean =>
  KitDraft.safeParse({ sessions: [build("x".repeat(length)), PAD_ONE, PAD_TWO] }).success;

const clean = session(FOUR_CLEAN);
const firstCue = (over: Parameters<typeof cue>[1]) => ({ ...clean, cues: [cue(FOUR_CLEAN[0], over), ...clean.cues.slice(1)] });

describe("LIMITS match the Kit contract (src/contracts/kit.ts)", () => {
  it.each([
    ["title", LIMITS.title, (t: string) => ({ ...clean, title: t })],
    ["theme", LIMITS.theme, (t: string) => ({ ...clean, theme: t })],
    ["prompt", LIMITS.prompt, (t: string) => firstCue({ prompts: [t] })],
    ["whyThis", LIMITS.whyThis, (t: string) => firstCue({ whyThis: t })],
    ["sensory activity", LIMITS.sensoryActivity, (t: string) => ({ ...clean, sensoryActivities: [t] })],
    ["caregiver tip", LIMITS.caregiverTip, (t: string) => ({ ...clean, caregiverTips: [t] })],
  ] as const)("the %s limit is the largest length the contract accepts", (_name, limit, build) => {
    expect(accepts(build, limit)).toBe(true);
    expect(accepts(build, limit + 1)).toBe(false);
  });

  it("the list and duration limits match", () => {
    const many = (n: number) => Array.from({ length: n }, () => "Pass the scarf.");
    expect(accepts(() => ({ ...clean, sensoryActivities: many(LIMITS.sensoryMax) }), 0)).toBe(true);
    expect(accepts(() => ({ ...clean, sensoryActivities: many(LIMITS.sensoryMax + 1) }), 0)).toBe(false);
    expect(accepts(() => ({ ...clean, caregiverTips: many(LIMITS.caregiverTipsMax) }), 0)).toBe(true);
    expect(accepts(() => ({ ...clean, caregiverTips: many(LIMITS.caregiverTipsMax + 1) }), 0)).toBe(false);
    for (const [minutes, ok] of [
      [LIMITS.durationMin.min, true],
      [LIMITS.durationMin.min - 1, false],
      [LIMITS.durationMin.max, true],
      [LIMITS.durationMin.max + 1, false],
    ] as const) {
      expect(accepts(() => ({ ...clean, durationMin: minutes }), 0)).toBe(ok);
    }
  });
});
