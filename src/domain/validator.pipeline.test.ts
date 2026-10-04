import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/agent/templates";
import { KitDraft, type Stage } from "@/contracts";
import { checkText } from "@/domain/checkText";
import { SESSION_FORMATS, wordCount } from "@/domain/sessionFormats";
import { validateKit } from "@/domain/validator";
import { ROGUE_DRAFT, ROGUE_REGISTRY, rogueContext } from "@/domain/validator/rogue";
import {
  FOUR_CLEAN,
  PAD_ONE,
  PAD_TWO,
  cue,
  guardFor,
  idsOf,
  kitOf,
  run,
  session,
} from "@/domain/validator/testkit";
import type { DraftSession, ValidationContext, ValidationResult } from "@/domain/validator/types";

const allIds = (result: ValidationResult) =>
  result.kit.sessions.flatMap((s) => s.cues.map((c) => c.entity_id));

describe("stage fit through validateKit (step 6, SC-7)", () => {
  it("repairs a late-stage conversation Session with too many long Prompts and no sensory activity", () => {
    const talky = session(["fx-film-breakfast-at-tiffanys", "fx-film-the-sound-of-music", "fx-tv-bonanza"], {
      format: "conversation",
      sensoryActivities: [],
      cues: ["fx-film-breakfast-at-tiffanys", "fx-film-the-sound-of-music", "fx-tv-bonanza"].map((id) =>
        cue(id, {
          prompts: [
            "Tell me about the dances you went to on a Saturday night when you were young and free.",
            "Tell me about your favourite dress.",
            "Tell me about the music.",
          ],
        }),
      ),
    });
    const result = run(talky, {}, "late");
    const fixed = result.kit.sessions[0]!;
    expect(fixed.format).toBe("sensory");
    expect(fixed.sensoryActivities.length).toBeGreaterThanOrEqual(2);
    for (const c of fixed.cues) {
      expect(c.prompts).toHaveLength(1);
      expect(wordCount(c.prompts[0]!)).toBeLessThanOrEqual(12);
    }
    expect(result.repairs.map((r) => r.reason)).toEqual(
      expect.arrayContaining(["format_set", "prompts_trimmed", "prompt_too_many_words", "sensory_topped_up"]),
    );
  });

  it("drops Cues beyond the stage maximum and reports them as stage_fit drops", () => {
    const seven = session([
      ...FOUR_CLEAN,
      "fx-film-some-like-it-hot",
      "fx-film-west-side-story",
      "fx-tv-perry-mason",
    ]);
    const result = run(seven, {}, "middle");
    expect(idsOf(result)).toHaveLength(SESSION_FORMATS.middle.cues.max);
    expect(result.drops).toContainEqual({
      step: "stage_fit",
      reason: "over_stage_cap",
      sessionIndex: 0,
      entityId: "fx-tv-perry-mason",
    });
  });
});

describe("novelty (step 7)", () => {
  const everyId = [...FOUR_CLEAN, ...PAD_ONE.cues.map((c) => c.entity_id), ...PAD_TWO.cues.map((c) => c.entity_id)];
  const newShare = (result: ValidationResult, previous: readonly string[]) => {
    const ids = allIds(result);
    return ids.filter((id) => !previous.includes(id)).length / ids.length;
  };

  it("swaps the lowest-affinity repeats for unused new Cues of the same domain until 30% are new", () => {
    const result = run(session(FOUR_CLEAN), { previousCueIds: everyId });
    expect(newShare(result, everyId)).toBeGreaterThanOrEqual(0.3);
    expect(allIds(result)).not.toContain("fx-tv-bonanza");
    expect(allIds(result)).toContain("fx-tv-perry-mason");
    const swaps = result.repairs.filter((r) => r.reason === "novelty_swap");
    expect(swaps.length).toBeGreaterThan(0);
    expect(swaps.every((r) => r.step === "novelty")).toBe(true);
  });

  it("swaps within the same domain", () => {
    const result = run(session(FOUR_CLEAN), { previousCueIds: everyId });
    const domainById = new Map(ROGUE_REGISTRY.map((e) => [e.entityId, e.domain]));
    const before = kitOf(session(FOUR_CLEAN)).sessions.map((s) => s.cues.map((c) => domainById.get(c.entity_id)));
    const after = result.kit.sessions.map((s) => s.cues.map((c) => domainById.get(c.entity_id)));
    expect(after).toEqual(before);
  });

  it("re-checks a swapped-in Cue against grounding, Exclusions, screening and the Window", () => {
    const result = run(session(FOUR_CLEAN), { previousCueIds: everyId });
    const unsafe = [
      "fx-music-elvis-presley",
      "fx-music-patsy-cline",
      "fx-music-ray-price",
      "fx-film-gone-with-the-wind",
      "fx-film-mystery-reel",
      "fx-tv-general-hospital",
      "fx-book-war-diaries",
      "fx-film-rear-window",
    ];
    for (const id of unsafe) expect(allIds(result)).not.toContain(id);
  });

  it("leaves a domain alone when no admissible new Cue exists for it", () => {
    const result = run(session(FOUR_CLEAN), { previousCueIds: everyId });
    expect(allIds(result)).toContain("fx-book-peyton-place");
  });

  it("does nothing when at least 30% of the Cues are already new", () => {
    const previous = FOUR_CLEAN;
    const result = run(session(FOUR_CLEAN), { previousCueIds: previous });
    expect(result.repairs.filter((r) => r.reason === "novelty_swap")).toEqual([]);
  });

  it("does nothing for a first Kit, which has no previous Cues", () => {
    const result = run(session(FOUR_CLEAN), { previousCueIds: [] });
    expect(result.repairs).toEqual([]);
  });

  it("gives a swapped-in Cue vetted whyThis and Prompts", () => {
    const result = run(session(FOUR_CLEAN), { previousCueIds: everyId });
    const swapped = result.kit.sessions.flatMap((s) => s.cues).find((c) => c.entity_id === "fx-tv-perry-mason")!;
    expect(swapped.whyThis).toBe(TEMPLATES.whyThis.tv);
    expect(swapped.prompts.length).toBeGreaterThanOrEqual(1);
    for (const prompt of swapped.prompts) expect(TEMPLATES.prompts.tv.middle).toContain(prompt);
  });

  it("keeps a Learned Favorite out even when it is the only new Cue of a domain", () => {
    const base = rogueContext(TEMPLATES, "middle");
    const profile = {
      ...base.profile,
      learnedFavorites: [
        { entityId: "fx-tv-perry-mason", name: "Perry Mason", domain: "tv" as const, weight: 1, fromSessionId: "s1" },
      ],
    };
    const result = run(session(FOUR_CLEAN), { previousCueIds: everyId, profile });
    expect(allIds(result)).not.toContain("fx-tv-perry-mason");
  });
});

describe("backfill (step 8)", () => {
  const twoGood = ["fx-film-breakfast-at-tiffanys", "fx-film-the-sound-of-music"];
  const rogueTwo = [...twoGood, "fx-film-invented", "fx-music-elvis-presley"];

  it("refills a Session to the stage minimum from the highest-affinity admissible unused Cues", () => {
    const result = run(session(rogueTwo));
    expect(idsOf(result)).toHaveLength(SESSION_FORMATS.middle.cues.min);
    const added = idsOf(result).slice(2);
    const affinity = (id: string) => ROGUE_REGISTRY.find((e) => e.entityId === id)!.affinity!;
    expect(affinity(added[0]!)).toBeGreaterThanOrEqual(affinity(added[1]!));
    expect(result.repairs.filter((r) => r.step === "backfill" && r.reason === "backfill")).toHaveLength(2);
  });

  it("never backfills an excluded, echoed, screened or out-of-Window Cue, or one already in the Kit", () => {
    const result = run(session(rogueTwo));
    const ids = allIds(result);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of [
      "fx-music-elvis-presley",
      "fx-music-patsy-cline",
      "fx-film-pillow-talk",
      "fx-music-ray-price",
      "fx-tv-general-hospital",
      "fx-book-war-diaries",
      "fx-film-gone-with-the-wind",
      "fx-film-mystery-reel",
      "fx-film-rear-window",
    ]) {
      expect(ids).not.toContain(id);
    }
  });

  it("prefers new Cues over repeats when a previous Kit exists", () => {
    const result = run(session(rogueTwo), { previousCueIds: ["fx-music-tammy-wynette", "fx-music-kitty-wells"] });
    expect(idsOf(result)).not.toContain("fx-music-tammy-wynette");
    expect(idsOf(result)).not.toContain("fx-music-kitty-wells");
  });

  it("gives each backfilled Cue a vetted whyThis and a stage-sized Prompt", () => {
    const result = run(session(rogueTwo), {}, "late");
    const added = result.kit.sessions[0]!.cues.slice(2);
    expect(added.length).toBeGreaterThan(0);
    for (const c of added) {
      expect(c.whyThis).toBe(TEMPLATES.whyThis[c.domain]);
      expect(c.prompts).toHaveLength(SESSION_FORMATS.late.maxPromptsPerCue);
      expect(wordCount(c.prompts[0]!)).toBeLessThanOrEqual(SESSION_FORMATS.late.maxWordsPerPrompt);
    }
  });

  it("uses the late-stage minimum of 3 Cues", () => {
    const result = run(session(twoGood), {}, "late");
    expect(idsOf(result).length).toBe(SESSION_FORMATS.late.cues.min);
  });

  it("flags a backfilled film inside the widened Window but outside the original one", () => {
    const registry = ROGUE_REGISTRY.filter((e) => e.domain === "film" && e.entityId !== "fx-film-pillow-talk");
    const result = run(session(["fx-film-the-sound-of-music"]), { registry, widened: ["film"] });
    const rear = result.kit.sessions[0]!.cues.find((c) => c.entity_id === "fx-film-rear-window");
    expect(rear?.outsideWindow).toBe(true);
  });

  it("reports a shortfall when the registry has nothing admissible left", () => {
    const registry = ROGUE_REGISTRY.filter((e) =>
      ["fx-film-breakfast-at-tiffanys", "fx-film-the-sound-of-music"].includes(e.entityId),
    );
    const result = run(session(twoGood), { registry });
    expect(result.shortfalls.length).toBeGreaterThan(0);
    expect(result.shortfalls[0]).toEqual({ sessionIndex: 0, have: 2, need: 4 });
  });
});

describe("the rogue draft (EVALS d and g, ticket 10 demo)", () => {
  const ctx = rogueContext(TEMPLATES, "late");
  const result = validateKit(ROGUE_DRAFT, ctx);

  it.each([
    ["fx-film-invented-by-the-model", "not_in_registry", 0],
    ["fx-music-elvis-presley", "excluded_entity", 0],
    ["fx-film-gone-with-the-wind", "outside_window", 0],
    ["fx-film-mystery-reel", "missing_year", 0],
    ["fx-music-patsy-cline", "seed_or_favorite_echo", 0],
    ["fx-film-breakfast-at-tiffanys", "duplicate_cue", 0],
    ["fx-book-war-diaries", "sensitive_name", 2],
    ["fx-tv-general-hospital", "avoid_topic_name", 2],
  ] as const)("drops %s as %s", (entityId, reason, sessionIndex) => {
    expect(result.drops).toContainEqual(expect.objectContaining({ entityId, reason, sessionIndex }));
  });

  it("produces a Kit that passes the draft contract", () => {
    expect(KitDraft.safeParse(result.kit).success).toBe(true);
  });

  it("repairs every text problem", () => {
    const fields = result.repairs.filter((r) => r.step === "text").map((r) => `${r.sessionIndex}:${r.field}`);
    expect(fields).toEqual(
      expect.arrayContaining([
        "0:cues[0].prompts[0]",
        "1:title",
        "1:theme",
        "1:caregiverTips[0]",
        "1:cues[0].whyThis",
        "1:cues[0].prompts[0]",
      ]),
    );
    const guard = guardFor(ctx);
    for (const s of result.kit.sessions) {
      expect(checkText(s.title, "heading", guard)).toEqual([]);
      expect(checkText(s.theme, "heading", guard)).toEqual([]);
      for (const tip of s.caregiverTips) expect(checkText(tip, "body", guard)).toEqual([]);
      for (const c of s.cues) {
        expect(checkText(c.whyThis, "body", guard)).toEqual([]);
        for (const p of c.prompts) expect(checkText(p, "body", guard)).toEqual([]);
      }
    }
  });

  it("keeps the UX title and the quoted Cue name untouched", () => {
    expect(result.kit.sessions[0]!.title).toBe("Saturday Night at the Pictures, 1962");
    const quoted = result.kit.sessions[1]!.cues.find((c) => c.entity_id === "fx-music-brenda-lee")!;
    expect(quoted.prompts[0]).toBe('Tell me about seeing "Pillow Talk" at the pictures.');
  });

  it("makes every Session late-stage compliant", () => {
    const rule = SESSION_FORMATS.late;
    for (const s of result.kit.sessions) {
      expect(s.format).toBe("sensory");
      expect(s.sensoryActivities.length).toBeGreaterThanOrEqual(rule.minSensoryActivities);
      expect(s.cues.length).toBeGreaterThanOrEqual(rule.cues.min);
      expect(s.cues.length).toBeLessThanOrEqual(rule.cues.max);
      for (const c of s.cues) {
        expect(c.prompts.length).toBeLessThanOrEqual(rule.maxPromptsPerCue);
        for (const p of c.prompts) expect(wordCount(p)).toBeLessThanOrEqual(rule.maxWordsPerPrompt);
      }
    }
  });

  it("shows only grounded, allowed, unique Cues", () => {
    const ids = allIds(result);
    expect(new Set(ids).size).toBe(ids.length);
    const registryIds = new Set(ROGUE_REGISTRY.map((e) => e.entityId));
    expect(ids.every((id) => registryIds.has(id))).toBe(true);
    expect(ids).not.toContain("fx-music-elvis-presley");
  });

  it("never mutates the draft it was given", () => {
    const snapshot = structuredClone(ROGUE_DRAFT);
    validateKit(ROGUE_DRAFT, ctx);
    expect(ROGUE_DRAFT).toEqual(snapshot);
  });

  it("makes zero drops and zero repairs on a second pass (idempotent)", () => {
    const second = validateKit(result.kit, ctx);
    expect(second.drops).toEqual([]);
    expect(second.repairs).toEqual([]);
    expect(second.kit).toEqual(result.kit);
  });
});

describe("idempotence across contexts", () => {
  const stages: Stage[] = ["early", "middle", "late"];
  const variants: ReadonlyArray<readonly [string, Partial<ValidationContext>]> = [
    ["plain", {}],
    ["widened film and tv", { widened: ["film", "tv"] }],
    ["previous Kit", { previousCueIds: ROGUE_DRAFT.sessions.flatMap((s) => s.cues.map((c) => c.entity_id)) }],
    ["opted in to sensitive themes", { sensitiveThemesOptIn: true }],
  ];

  it.each(stages.flatMap((stage) => variants.map(([name, over]) => [stage, name, over] as const)))(
    "validate(validate(x)) equals validate(x) at the %s stage, %s",
    (stage, _name, over) => {
      const ctx = { ...rogueContext(TEMPLATES, stage), ...over };
      const first = validateKit(ROGUE_DRAFT, ctx);
      const second = validateKit(first.kit, ctx);
      expect(second.kit).toEqual(first.kit);
      expect(second.drops).toEqual([]);
      expect(second.repairs).toEqual([]);
      expect(KitDraft.safeParse(first.kit).success).toBe(true);
    },
  );

  it("keeps a compliant Kit untouched", () => {
    const clean = kitOf(session(FOUR_CLEAN));
    const result = validateKit(clean, rogueContext(TEMPLATES, "middle"));
    expect(result.kit).toEqual(clean);
    const sessions: readonly DraftSession[] = result.kit.sessions;
    expect(sessions).toHaveLength(3);
  });
});
