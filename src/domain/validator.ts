/**
 * `validateKit`: the ADR 0003 backstop. A rogue or merely sloppy model draft
 * goes in; a compliant Kit comes out, with every drop and repair listed by
 * reason (PLAN section 3.2). It is pure and idempotent: a second pass over its
 * own output makes 0 drops and 0 repairs.
 *
 * Order (fixed): grounding, Exclusions and echoes, name screening (14.1),
 * Window, duplicates, text, stage fit, novelty, backfill. Steps 1-4 are one
 * verdict per Cue (`admit.ts`), so novelty swaps and backfill re-check against
 * them too.
 */
import type { KitDraft } from "@/contracts";
import { fitSessionToStage } from "@/domain/stageFit";
import { createAdmission } from "@/domain/validator/admit";
import { backfill } from "@/domain/validator/backfill";
import { filterCues, flagOutsideWindow } from "@/domain/validator/cues";
import { applyNovelty } from "@/domain/validator/novelty";
import { vetText } from "@/domain/validator/text";
import type { ValidationContext, ValidationResult } from "@/domain/validator/types";

export type * from "@/domain/validator/types";

/**
 * Repairs `draft` against the run's registry, Exclusions, Window and the
 * stage's format. The input is never mutated. Sessions that stay below the
 * stage's Cue minimum because the registry ran out are listed in `shortfalls`.
 */
export function validateKit(draft: KitDraft, ctx: ValidationContext): ValidationResult {
  const admission = createAdmission(ctx);
  const filtered = filterCues(draft.sessions, admission);
  const vetted = vetText(filtered.sessions, ctx);
  const fitted = vetted.value.map((session, sessionIndex) =>
    fitSessionToStage(session, { stage: ctx.stage, templates: ctx.templates, sessionIndex }),
  );
  const novel = applyNovelty(
    fitted.map((result) => result.session),
    ctx,
    admission,
  );
  const filled = backfill(novel.sessions, ctx, admission);
  return {
    kit: { sessions: flagOutsideWindow(filled.sessions, admission) },
    drops: [...filtered.drops, ...fitted.flatMap((result) => result.drops)],
    repairs: [
      ...filtered.repairs,
      ...vetted.repairs,
      ...fitted.flatMap((result) => result.repairs),
      ...novel.repairs,
      ...filled.repairs,
    ],
    shortfalls: filled.shortfalls,
  };
}
