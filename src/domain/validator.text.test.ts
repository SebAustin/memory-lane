import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/agent/templates";
import { checkText } from "@/domain/checkText";
import { validateKit } from "@/domain/validator";
import { rogueContext } from "@/domain/validator/rogue";
import {
  FOUR_CLEAN,
  PAD_ONE,
  PAD_TWO,
  cue,
  guardFor,
  run,
  session,
} from "@/domain/validator/testkit";
import type { DraftCue, ValidationResult } from "@/domain/validator/types";

/** Session 0 with one Cue's fields overridden. */
function withCue(index: number, over: Partial<DraftCue>) {
  const base = session(FOUR_CLEAN);
  return { ...base, cues: base.cues.map((c, i) => (i === index ? { ...c, ...over } : c)) };
}

const promptOf = (result: ValidationResult, cueIndex = 0, promptIndex = 0) =>
  result.kit.sessions[0]!.cues[cueIndex]!.prompts[promptIndex]!;

describe("text check and template replacement (step 5, FR-12)", () => {
  it("replaces a quiz Prompt with a vetted template for its domain and stage", () => {
    const result = run(withCue(0, { prompts: ["Do you remember who starred in this one?"] }));
    expect(TEMPLATES.prompts.film.middle).toContain(promptOf(result));
    expect(result.repairs).toContainEqual({
      step: "text",
      reason: "failed_text_check",
      sessionIndex: 0,
      field: "cues[0].prompts[0]",
      rules: ["quiz"],
    });
  });

  it("replaces an Avoid-List song title in a Prompt (Tennessee Waltz)", () => {
    const result = run(withCue(1, { prompts: ["Shall we hum the Tennessee Waltz together?"] }));
    expect(TEMPLATES.prompts.film.middle).toContain(promptOf(result, 1));
  });

  it("replaces a therapeutic claim in a caregiver tip (improves memory)", () => {
    const result = run(session(FOUR_CLEAN, { caregiverTips: ["This activity improves memory in just a week."] }));
    expect(TEMPLATES.caregiverTips.middle).toContain(result.kit.sessions[0]!.caregiverTips[0]);
    expect(result.repairs).toContainEqual(expect.objectContaining({ field: "caregiverTips[0]", rules: ["claim"] }));
  });

  it("replaces an invented Title-Case name in whyThis, using the domain's vetted line", () => {
    const result = run(withCue(0, { whyThis: "People your age in Memphis loved Marty Robbins too." }));
    expect(result.kit.sessions[0]!.cues[0]!.whyThis).toBe(TEMPLATES.whyThis.film);
    expect(result.repairs).toContainEqual(
      expect.objectContaining({ field: "cues[0].whyThis", rules: ["invented-name"] }),
    );
  });

  it("replaces a heading that carries a claim word, title and theme together", () => {
    const result = run(session(FOUR_CLEAN, { title: "Healing Songs of Memphis" }));
    const { title, theme } = result.kit.sessions[0]!;
    expect(TEMPLATES.titleThemes).toContainEqual({ title, theme });
    expect(result.repairs).toContainEqual(expect.objectContaining({ field: "title", rules: ["claim"] }));
    expect(result.repairs).toContainEqual(expect.objectContaining({ field: "theme" }));
  });

  it("replaces an Avoid-term title", () => {
    const result = run(session(FOUR_CLEAN, { title: "Tennessee Waltz Evenings" }));
    expect(TEMPLATES.titleThemes.map((t) => t.title)).toContain(result.kit.sessions[0]!.title);
  });

  it("replaces a quoted invented title in a theme", () => {
    const result = run(session(FOUR_CLEAN, { theme: 'An evening with "The Velvet Hour"' }));
    expect(TEMPLATES.titleThemes.map((t) => t.theme)).toContain(result.kit.sessions[0]!.theme);
    expect(result.repairs).toContainEqual(expect.objectContaining({ field: "theme", rules: ["quote"] }));
  });

  it.each(["Saturday Night at the Pictures, 1962", "Mama's Kitchen", "Sunday Best at the Grand Ole Opry"])(
    "lets the UX title %s pass untouched (EVALS g)",
    (title) => {
      const result = run(session(FOUR_CLEAN, { title }));
      expect(result.kit.sessions[0]!.title).toBe(title);
      expect(result.repairs).toEqual([]);
    },
  );

  it("does not reuse a title another Session already has", () => {
    const first = session(FOUR_CLEAN, { title: "Tennessee Waltz Evenings" });
    const result = run(first);
    const titles = result.kit.sessions.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("keeps a quoted Cue name in a Prompt", () => {
    const prompt = 'Tell me about seeing "Pillow Talk" at the pictures.';
    const result = run(withCue(0, { prompts: [prompt] }));
    expect(promptOf(result)).toBe(prompt);
  });

  it("replaces an over-long string even when it is otherwise clean", () => {
    const long = `Tell me about ${"a lovely afternoon at the pictures ".repeat(5)}`;
    const result = run(withCue(0, { prompts: [long] }));
    expect(promptOf(result)).not.toBe(long);
    expect(result.repairs).toContainEqual(
      expect.objectContaining({ field: "cues[0].prompts[0]", reason: "too_long" }),
    );
  });

  it("replaces a blank string", () => {
    const result = run(session(FOUR_CLEAN, { sensoryActivities: ["   "] }));
    expect(TEMPLATES.sensoryActivities.middle).toContain(result.kit.sessions[0]!.sensoryActivities[0]);
    expect(result.repairs).toContainEqual(
      expect.objectContaining({ field: "sensoryActivities[0]", reason: "empty_text" }),
    );
  });

  it("takes late-stage replacements from the late-stage templates", () => {
    const result = run(withCue(0, { prompts: ["Do you remember who starred in this one?"] }), {}, "late");
    expect(TEMPLATES.prompts.film.late).toContain(promptOf(result));
  });

  it("never gives a Cue the same replacement Prompt twice", () => {
    const quiz = ["Do you remember who starred in this one?", "What year was this one made?"];
    const result = run(withCue(0, { prompts: quiz }));
    expect(new Set(result.kit.sessions[0]!.cues[0]!.prompts).size).toBe(2);
  });

  it("applies the sensitive lexicon to text unless the Caregiver opted in, but Avoid terms always", () => {
    const sensitive = "Many people who share your era remember the war years.";
    expect(promptOf(run(withCue(0, { prompts: [sensitive] })))).not.toBe(sensitive);
    expect(promptOf(run(withCue(0, { prompts: [sensitive] }), { sensitiveThemesOptIn: true }))).toBe(sensitive);
    const avoid = "Tell me about the Vietnam War era.";
    expect(promptOf(run(withCue(0, { prompts: [avoid] }), { sensitiveThemesOptIn: true }))).not.toBe(avoid);
  });

  it("treats entity Exclusion labels as Avoid terms in text", () => {
    const result = run(withCue(0, { prompts: ["Tell me about Elvis Presley on the radio."] }));
    expect(promptOf(result)).not.toContain("Elvis");
  });

  it("only ever leaves strings that pass checkText in their scope", () => {
    const ctx = rogueContext(TEMPLATES, "middle");
    const first = session(FOUR_CLEAN, { title: "Healing Songs", caregiverTips: ["It can cure memory loss."] });
    const result = validateKit({ sessions: [first, PAD_ONE, PAD_TWO] }, ctx);
    const guard = guardFor(ctx);
    for (const s of result.kit.sessions) {
      expect(checkText(s.title, "heading", guard)).toEqual([]);
      expect(checkText(s.theme, "heading", guard)).toEqual([]);
      for (const tip of s.caregiverTips) expect(checkText(tip, "body", guard)).toEqual([]);
      for (const c of s.cues) for (const p of c.prompts) expect(checkText(p, "body", guard)).toEqual([]);
    }
  });

  it("fails loudly when the template library has no string for a slot", () => {
    const noPrompts = {
      ...TEMPLATES,
      prompts: { ...TEMPLATES.prompts, film: { ...TEMPLATES.prompts.film, middle: [] } },
    };
    expect(() =>
      validateKit(
        { sessions: [withCue(0, { prompts: ["Do you remember this?"] }), PAD_ONE, PAD_TWO] },
        rogueContext(noPrompts, "middle"),
      ),
    ).toThrow(RangeError);
  });

  it("leaves clean Cues exactly as the model wrote them", () => {
    const original = cue("fx-film-the-sound-of-music");
    const result = run(session(FOUR_CLEAN));
    expect(result.kit.sessions[0]!.cues[1]).toEqual(original);
  });
});
