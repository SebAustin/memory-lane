/**
 * Step 8 of `validateKit` (PLAN section 3.2): refill each Session to the
 * stage's minimum Cue count from the top-affinity unused registry Cues. Every
 * Cue added is re-checked against grounding, Exclusions, name screening and the
 * Window, and is never a duplicate. New Cues are preferred over repeats, so
 * backfill cannot undo the novelty rule.
 */
import { SESSION_FORMATS } from "@/domain/sessionFormats";
import type { Admission } from "@/domain/validator/admit";
import { affinityOf, vettedCue } from "@/domain/validator/fill";
import type {
  Repair,
  Shortfall,
  ValidatedSession,
  ValidationContext,
} from "@/domain/validator/types";

export interface BackfillResult {
  readonly sessions: ValidatedSession[];
  readonly repairs: Repair[];
  readonly shortfalls: Shortfall[];
}

/** Tops every Session up to the stage minimum; reports a shortfall when the registry runs dry. */
export function backfill(
  sessions: readonly ValidatedSession[],
  ctx: ValidationContext,
  admission: Admission,
): BackfillResult {
  const need = SESSION_FORMATS[ctx.stage].cues.min;
  const previous = new Set(ctx.previousCueIds);
  const used = new Set(sessions.flatMap((session) => session.cues.map((cue) => cue.entity_id)));
  const ranked = ctx.registry
    .filter((entry) => admission.verdict(entry.entityId).ok)
    .sort(
      (a, b) =>
        Number(previous.has(a.entityId)) - Number(previous.has(b.entityId)) || affinityOf(b) - affinityOf(a),
    );

  const repairs: Repair[] = [];
  const shortfalls: Shortfall[] = [];
  const filled = sessions.map((session, sessionIndex) => {
    const added = ranked
      .filter((entry) => !used.has(entry.entityId))
      .slice(0, Math.max(0, need - session.cues.length));
    added.forEach((entry, offset) => {
      used.add(entry.entityId);
      repairs.push({
        step: "backfill",
        reason: "backfill",
        sessionIndex,
        field: `cues[${session.cues.length + offset}]`,
      });
    });
    const cues = [
      ...session.cues,
      ...added.map((entry, offset) => vettedCue(entry, ctx, sessionIndex + session.cues.length + offset)),
    ];
    if (cues.length < need) shortfalls.push({ sessionIndex, have: cues.length, need });
    return { ...session, cues };
  });
  return { sessions: filled, repairs, shortfalls };
}
