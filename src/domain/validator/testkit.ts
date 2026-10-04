/**
 * Builders shared by the `validateKit` test files: clean Cues and Sessions that
 * a test then breaks on purpose. Test support only; nothing in the app imports it.
 */
import { TEMPLATES } from "@/agent/templates";
import type { KitDraft, Stage } from "@/contracts";
import { validateKit } from "@/domain/validator";
import { ROGUE_REGISTRY, rogueContext } from "@/domain/validator/rogue";
import type {
  DraftCue,
  DraftSession,
  ValidationContext,
  ValidationResult,
} from "@/domain/validator/types";

const DOMAIN_OF = new Map(ROGUE_REGISTRY.map((e) => [e.entityId, e.domain]));

/** A clean Cue: grounded, an open Prompt, an aggregate whyThis. */
export function cue(entityId: string, over: Partial<DraftCue> = {}): DraftCue {
  return {
    entity_id: entityId,
    domain: DOMAIN_OF.get(entityId) ?? "film",
    whyThis: "Many people who share your era loved this.",
    prompts: ["Tell me about a time you enjoyed this."],
    ...over,
  };
}

/** A clean middle-stage Session; override what a test needs to break. */
export function session(ids: readonly string[], over: Partial<DraftSession> = {}): DraftSession {
  return {
    title: "Sunday Afternoons",
    theme: "Easy afternoons at home",
    format: "mixed",
    durationMin: 30,
    sensoryActivities: ["Pass around a soft scarf."],
    caregiverTips: ["Sit side by side and let {name} set the pace."],
    cues: ids.map((id) => cue(id)),
    ...over,
  };
}

export const PAD_ONE = session(
  ["fx-music-loretta-lynn", "fx-music-dolly-parton", "fx-music-brenda-lee", "fx-music-jim-reeves"],
  { title: "Radio Days", theme: "Songs on the kitchen radio" },
);
export const PAD_TWO = session(
  ["fx-film-mary-poppins", "fx-film-blue-hawaii", "fx-tv-andy-griffith", "fx-book-peyton-place"],
  { title: "Downtown Saturdays", theme: "Pictures and television at home" },
);

/** Four in-Window film, TV and book Cues that no test breaks. */
export const FOUR_CLEAN = [
  "fx-film-breakfast-at-tiffanys",
  "fx-film-the-sound-of-music",
  "fx-tv-bonanza",
  "fx-book-mockingbird",
] as const;

/** A Kit whose first Session is under test; the other two are clean padding. */
export function kitOf(first: DraftSession): KitDraft {
  return { sessions: [first, PAD_ONE, PAD_TWO] };
}

/** Validates `kitOf(first)` in the rogue scenario, middle stage unless told otherwise. */
export function run(
  first: DraftSession,
  over: Partial<ValidationContext> = {},
  stage: Stage = "middle",
): ValidationResult {
  return validateKit(kitOf(first), { ...rogueContext(TEMPLATES, stage), ...over });
}

export const idsOf = (result: ValidationResult, sessionIndex = 0): string[] =>
  result.kit.sessions[sessionIndex]!.cues.map((c) => c.entity_id);

/** The text guard's view of the run: used to prove a replacement string is itself clean. */
export function guardFor(ctx: ValidationContext) {
  return {
    registryNames: ctx.registry.map((e) => e.name),
    seedNames: ctx.profile.seeds.map((s) => s.name),
    learnedFavoriteNames: ctx.profile.learnedFavorites.map((f) => f.name),
    fingerprintTagNames: ctx.fingerprintTagNames,
    places: ctx.places,
    avoidTopics: ctx.profile.avoidTopics,
    sensitiveThemesOptIn: ctx.sensitiveThemesOptIn,
  };
}
