import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/agent/templates";
import { KitDraft, Stage } from "@/contracts";
import { validateKit } from "@/domain/validator";
import { ROGUE_REGISTRY, rogueContext } from "@/domain/validator/rogue";
import type { DraftCue, DraftSession } from "@/domain/validator/types";

/** A small seeded generator, so a failure is reproducible from its seed. */
function lcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const IDS = [...ROGUE_REGISTRY.map((e) => e.entityId), "fx-invented-1", "fx-invented-2"];
const TEXTS = [
  "Tell me about a time you enjoyed this.",
  "Do you remember who starred in this one?",
  "Shall we hum the Tennessee Waltz together?",
  "This will improve memory.",
  "People in Memphis loved Marty Robbins too.",
  'Tell me about seeing "Pillow Talk" at the pictures.',
  'An evening with "The Velvet Hour"',
  "Saturday Night at the Pictures, 1962",
  "Healing Songs of Memphis",
  "",
  "Let's listen together and see what you notice about the sound of this lovely old song from the radio.",
  "x".repeat(250),
];

function build(random: () => number): KitDraft {
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)]!;
  const some = <T>(list: readonly T[], min: number, max: number): T[] =>
    Array.from({ length: min + Math.floor(random() * (max - min + 1)) }, () => pick(list));
  const cue = (): DraftCue => ({
    entity_id: pick(IDS),
    domain: pick(["music", "film", "tv", "book", "place", "brand"] as const),
    whyThis: pick(TEXTS),
    prompts: some(TEXTS, 1, 3),
  });
  const session = (): DraftSession => ({
    title: pick(TEXTS),
    theme: pick(TEXTS),
    format: pick(["conversation", "mixed", "sensory"] as const),
    durationMin: Math.floor(random() * 120),
    sensoryActivities: some(TEXTS, 0, 4),
    caregiverTips: some(TEXTS, 0, 4),
    cues: Array.from({ length: 3 + Math.floor(random() * 6) }, cue),
  });
  return { sessions: Array.from({ length: 3 }, session) };
}

describe("validateKit on random rogue drafts", () => {
  it.each(Stage.options)("is idempotent and contract-compliant at the %s stage", (stage) => {
    const random = lcg(stage.length * 7919);
    for (let round = 0; round < 80; round += 1) {
      const draft = build(random);
      const previousCueIds = round % 2 === 0 ? [] : IDS.filter(() => random() < 0.5);
      const widened = round % 3 === 0 ? (["film", "tv", "book"] as const) : [];
      const ctx = { ...rogueContext(TEMPLATES, stage), previousCueIds, widened };

      const first = validateKit(draft, ctx);
      const second = validateKit(first.kit, ctx);

      expect(second.drops, `round ${round} drops`).toEqual([]);
      expect(second.repairs, `round ${round} repairs`).toEqual([]);
      expect(second.kit, `round ${round} kit`).toEqual(first.kit);
      expect(KitDraft.safeParse(first.kit).success, `round ${round} contract`).toBe(true);
      expect(first.shortfalls).toEqual([]);
    }
  });
});
