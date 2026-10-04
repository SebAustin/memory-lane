import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/agent/templates";
import { Stage } from "@/contracts";
import { SESSION_FORMATS, wordCount } from "@/domain/sessionFormats";
import { fitSessionToStage } from "@/domain/stageFit";
import type { ValidatedCue, ValidatedSession } from "@/domain/validator/types";

const STAGES = Stage.options;

const words = (n: number): string => `Tell me ${"about the lovely old days ".repeat(n)}`.split(" ").slice(0, n).join(" ");

function cueWith(id: string, prompts: string[]): ValidatedCue {
  return { entity_id: id, domain: "music", whyThis: "Many people who share your era loved this.", prompts };
}

function sessionWith(over: Partial<ValidatedSession> = {}): ValidatedSession {
  return {
    title: "Radio Days",
    theme: "Songs on the kitchen radio",
    format: "conversation",
    durationMin: 30,
    sensoryActivities: ["Pass around a soft scarf."],
    caregiverTips: ["Sit side by side."],
    cues: ["a", "b", "c", "d"].map((id) => cueWith(id, ["Tell me about a song you loved."])),
    ...over,
  };
}

const fit = (session: ValidatedSession, stage: Stage) =>
  fitSessionToStage(session, { stage, templates: TEMPLATES, sessionIndex: 0 });

describe.each(STAGES)("fitSessionToStage at the %s stage (SC-7)", (stage) => {
  const rule = SESSION_FORMATS[stage];

  it("sets the stage's format", () => {
    const { session, repairs } = fit(sessionWith({ format: stage === "early" ? "sensory" : "conversation" }), stage);
    expect(session.format).toBe(rule.format);
    expect(repairs).toContainEqual({ step: "stage_fit", reason: "format_set", sessionIndex: 0, field: "format" });
  });

  it("trims a Cue's Prompts to the cap", () => {
    const many = ["Tell me about one.", "Tell me about two.", "Tell me about three.", "Tell me about four."];
    const { session, repairs } = fit(sessionWith({ cues: [cueWith("a", many), ...sessionWith().cues.slice(1)] }), stage);
    expect(session.cues[0]!.prompts).toEqual(many.slice(0, rule.maxPromptsPerCue));
    expect(repairs).toContainEqual(
      expect.objectContaining({ reason: "prompts_trimmed", field: "cues[0].prompts" }),
    );
  });

  it("replaces a Prompt that runs over the word cap with a vetted template that fits", () => {
    const long = words(rule.maxWordsPerPrompt + 1);
    const { session, repairs } = fit(sessionWith({ cues: [cueWith("a", [long]), ...sessionWith().cues.slice(1)] }), stage);
    const [prompt] = session.cues[0]!.prompts;
    expect(TEMPLATES.prompts.music[stage]).toContain(prompt);
    expect(wordCount(prompt!)).toBeLessThanOrEqual(rule.maxWordsPerPrompt);
    expect(repairs).toContainEqual(
      expect.objectContaining({ reason: "prompt_too_many_words", field: "cues[0].prompts[0]" }),
    );
  });

  it("keeps a Prompt exactly at the word cap", () => {
    const exact = words(rule.maxWordsPerPrompt);
    expect(wordCount(exact)).toBe(rule.maxWordsPerPrompt);
    const { session } = fit(sessionWith({ cues: [cueWith("a", [exact]), ...sessionWith().cues.slice(1)] }), stage);
    expect(session.cues[0]!.prompts).toEqual([exact]);
  });

  it("gives a Cue with no Prompts one vetted Prompt", () => {
    const { session, repairs } = fit(sessionWith({ cues: [cueWith("a", []), ...sessionWith().cues.slice(1)] }), stage);
    expect(TEMPLATES.prompts.music[stage]).toContain(session.cues[0]!.prompts[0]);
    expect(repairs).toContainEqual(expect.objectContaining({ reason: "prompts_topped_up" }));
  });

  it("tops sensory activities up to the stage minimum without repeating one", () => {
    const { session, repairs } = fit(sessionWith({ sensoryActivities: [] }), stage);
    expect(session.sensoryActivities.length).toBe(rule.minSensoryActivities);
    expect(new Set(session.sensoryActivities).size).toBe(session.sensoryActivities.length);
    for (const activity of session.sensoryActivities) expect(TEMPLATES.sensoryActivities[stage]).toContain(activity);
    expect(repairs).toContainEqual(expect.objectContaining({ reason: "sensory_topped_up" }));
  });

  it("trims more than 3 sensory activities and more than 3 tips", () => {
    const five = ["One.", "Two.", "Three.", "Four.", "Five."];
    const { session, repairs } = fit(sessionWith({ sensoryActivities: five, caregiverTips: five }), stage);
    expect(session.sensoryActivities).toEqual(five.slice(0, 3));
    expect(session.caregiverTips).toEqual(five.slice(0, 3));
    expect(repairs.map((r) => r.reason)).toEqual(expect.arrayContaining(["sensory_trimmed", "tips_trimmed"]));
  });

  it("gives a Session with no caregiver tip one vetted tip", () => {
    const { session, repairs } = fit(sessionWith({ caregiverTips: [] }), stage);
    expect(TEMPLATES.caregiverTips[stage]).toContain(session.caregiverTips[0]);
    expect(repairs).toContainEqual(expect.objectContaining({ reason: "tips_topped_up" }));
  });

  it("drops Cues beyond the stage maximum, last first", () => {
    const ids = Array.from({ length: rule.cues.max + 2 }, (_unused, i) => `cue-${i}`);
    const { session, drops } = fit(sessionWith({ cues: ids.map((id) => cueWith(id, ["Tell me about a song."])) }), stage);
    expect(session.cues.map((c) => c.entity_id)).toEqual(ids.slice(0, rule.cues.max));
    expect(drops).toEqual(
      ids.slice(rule.cues.max).map((entityId) => ({ step: "stage_fit", reason: "over_stage_cap", sessionIndex: 0, entityId })),
    );
  });

  it("clamps the duration to 20 to 45 minutes", () => {
    expect(fit(sessionWith({ durationMin: 90 }), stage).session.durationMin).toBe(45);
    expect(fit(sessionWith({ durationMin: 5 }), stage).session.durationMin).toBe(20);
    expect(fit(sessionWith({ durationMin: 30.6 }), stage).session.durationMin).toBe(31);
    const { repairs } = fit(sessionWith({ durationMin: 90 }), stage);
    expect(repairs).toContainEqual({ step: "stage_fit", reason: "duration_clamped", sessionIndex: 0, field: "durationMin" });
  });

  it("leaves a session that already fits exactly as it is", () => {
    const fitted = fit(sessionWith(), stage).session;
    const again = fit(fitted, stage);
    expect(again.session).toEqual(fitted);
    expect(again.repairs).toEqual([]);
    expect(again.drops).toEqual([]);
  });
});

describe("late stage", () => {
  it("always ends with at least 2 sensory activities and at most 1 short Prompt per Cue", () => {
    const rogue = sessionWith({
      format: "conversation",
      sensoryActivities: [],
      cues: ["a", "b", "c"].map((id) =>
        cueWith(id, ["Tell me about the dances you went to on a Saturday night back then.", "Tell me more.", "And then?"]),
      ),
    });
    const { session } = fit(rogue, "late");
    expect(session.format).toBe("sensory");
    expect(session.sensoryActivities.length).toBeGreaterThanOrEqual(2);
    for (const cue of session.cues) {
      expect(cue.prompts).toHaveLength(1);
      expect(wordCount(cue.prompts[0]!)).toBeLessThanOrEqual(12);
    }
  });
});
