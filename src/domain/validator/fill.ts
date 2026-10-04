/**
 * Cues the validator adds itself (novelty swaps and backfill). They come from
 * the registry, so they are grounded, and are written from the vetted templates
 * so they need no text check (ADR 0003, FR-12).
 */
import { SESSION_FORMATS } from "@/domain/sessionFormats";
import { pickTemplate } from "@/domain/validator/pick";
import type { RegistryEntry, ValidatedCue, ValidationContext } from "@/domain/validator/types";

/** Prompts a validator-written Cue gets: two where the stage allows, else one. */
const FILLED_PROMPTS = 2;

/** A Cue for `entry` with a vetted whyThis and vetted Prompts that fit the stage. */
export function vettedCue(entry: RegistryEntry, ctx: ValidationContext, salt: number): ValidatedCue {
  const count = Math.min(FILLED_PROMPTS, SESSION_FORMATS[ctx.stage].maxPromptsPerCue);
  const pool = ctx.templates.prompts[entry.domain][ctx.stage];
  const prompts: string[] = [];
  while (prompts.length < count) prompts.push(pickTemplate(pool, prompts, salt + prompts.length));
  return {
    entity_id: entry.entityId,
    domain: entry.domain,
    whyThis: ctx.templates.whyThis[entry.domain],
    prompts,
  };
}

/** Qloo affinity, with "not reported" counted as 0. */
export const affinityOf = (entry: RegistryEntry): number => entry.affinity ?? 0;
