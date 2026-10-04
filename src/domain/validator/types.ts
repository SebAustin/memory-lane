/**
 * Types of the `validateKit` pipeline (PLAN section 3.2, ADR 0003). Pure data
 * shapes: `domain` stays free of server-only imports, so the registry arrives
 * as plain entries and the vetted templates arrive through the context.
 */
import type { Domain, KitDraft, KitRequest, Stage, TasteProfile } from "@/contracts";
import type { TemplateLibrary } from "@/domain/templateLibrary";
import type { ReminiscenceWindow } from "@/domain/window";

/** One entity of the run's Qloo registry: the only source a Cue may come from. */
export interface RegistryEntry {
  readonly entityId: string;
  readonly domain: Domain;
  readonly name: string;
  readonly year?: number;
  readonly tags: ReadonlyArray<{ readonly id: string; readonly name: string }>;
  /** Qloo affinity 0..1, or null when Qloo reported none (treated as 0). */
  readonly affinity: number | null;
}

/** Domains the Caregiver can widen: film, TV and books. */
export type WidenableDomain = KitRequest["widen"][number];

/** What `validateKit` needs to know about the run. */
export interface ValidationContext {
  /** Every entity that came from Qloo in this run (prefetch plus `expand_theme`). */
  readonly registry: readonly RegistryEntry[];
  readonly stage: Stage;
  /** The ORIGINAL Reminiscence Window. Widening is read from `widened`. */
  readonly window: ReminiscenceWindow;
  /** Domains the Caregiver widened by 3 years. */
  readonly widened: readonly WidenableDomain[];
  readonly profile: Pick<TasteProfile, "seeds" | "learnedFavorites" | "exclusions" | "avoidTopics">;
  readonly sensitiveThemesOptIn: boolean;
  readonly fingerprintTagNames: readonly string[];
  /** Hometown, Young-Adult City and Care Location. */
  readonly places: readonly string[];
  /** Cue ids of the previous Kit, for the novelty rule. Empty for a first Kit. */
  readonly previousCueIds: readonly string[];
  /** Vetted replacement strings. The caller passes `TEMPLATES` from `src/agent/templates.ts`. */
  readonly templates: TemplateLibrary;
}

export type DraftSession = KitDraft["sessions"][number];
export type DraftCue = DraftSession["cues"][number];

/**
 * A Cue after validation. `outsideWindow: true` marks a film, TV or book Cue
 * that is inside a widened Window but outside the ORIGINAL one (R2). The key is
 * absent otherwise. It is a plain superset of the model's `KitDraft` cue, so a
 * validated Kit is itself a valid `KitDraft`.
 */
export type ValidatedCue = DraftCue & { readonly outsideWindow?: true };
export type ValidatedSession = Omit<DraftSession, "cues"> & { cues: ValidatedCue[] };
export interface ValidatedKit {
  sessions: ValidatedSession[];
}

export type DropStep =
  | "grounding"
  | "exclusions"
  | "screening"
  | "window"
  | "duplicates"
  | "stage_fit";

export type DropReason =
  | "not_in_registry"
  | "excluded_entity"
  | "excluded_tag"
  | "seed_or_favorite_echo"
  | "avoid_topic_name"
  | "sensitive_name"
  | "missing_year"
  | "outside_window"
  | "duplicate_cue"
  | "over_stage_cap";

/** A Cue the validator removed. Carries ids and reasons only, never model text. */
export interface Drop {
  readonly step: DropStep;
  readonly reason: DropReason;
  readonly sessionIndex: number;
  readonly entityId: string;
}

export type RepairStep = "grounding" | "text" | "stage_fit" | "novelty" | "backfill";

export type RepairReason =
  | "domain_corrected"
  | "failed_text_check"
  | "too_long"
  | "empty_text"
  | "format_set"
  | "duration_clamped"
  | "prompts_trimmed"
  | "prompt_too_many_words"
  | "sensory_trimmed"
  | "sensory_topped_up"
  | "tips_trimmed"
  | "tips_topped_up"
  | "prompts_topped_up"
  | "novelty_swap"
  | "backfill";

/** A change the validator made in place. `rules` names the `checkText` rules that fired. */
export interface Repair {
  readonly step: RepairStep;
  readonly reason: RepairReason;
  readonly sessionIndex: number;
  /** For example `title`, `theme`, `cues[2].prompts[0]`, `sensoryActivities`. */
  readonly field: string;
  readonly rules?: readonly string[];
}

/** A Session that stayed below the stage's Cue minimum because the registry ran out. */
export interface Shortfall {
  readonly sessionIndex: number;
  readonly have: number;
  readonly need: number;
}

export interface ValidationResult {
  readonly kit: ValidatedKit;
  readonly drops: readonly Drop[];
  readonly repairs: readonly Repair[];
  readonly shortfalls: readonly Shortfall[];
}
