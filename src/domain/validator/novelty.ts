/**
 * Step 7 of `validateKit` (PLAN section 3.2): a next Kit must not be mostly a
 * rerun. When fewer than 30% of the Cues are new versus the previous Kit, the
 * lowest-affinity repeats are swapped for unused new Cues of the same domain.
 * Every swapped-in Cue is re-checked against grounding, Exclusions, name
 * screening and the Window.
 */
import type { Admission } from "@/domain/validator/admit";
import { affinityOf, vettedCue } from "@/domain/validator/fill";
import type {
  RegistryEntry,
  Repair,
  ValidatedSession,
  ValidationContext,
} from "@/domain/validator/types";

/** Minimum share of new Cues, in percent (integer maths avoids float edge cases). */
export const MIN_NEW_PERCENT = 30;

interface Slot {
  readonly sessionIndex: number;
  readonly cueIndex: number;
  readonly entityId: string;
  readonly entry: RegistryEntry;
}

/** Swaps repeats for new Cues until the Kit is at least 30% new, or no swap is possible. */
export function applyNovelty(
  sessions: readonly ValidatedSession[],
  ctx: ValidationContext,
  admission: Admission,
): { readonly sessions: ValidatedSession[]; readonly repairs: Repair[] } {
  const previous = new Set(ctx.previousCueIds);
  // Every Cue left after grounding is in the registry, so `entry` is always found.
  const slots: Slot[] = sessions.flatMap((session, sessionIndex) =>
    session.cues.map((cue, cueIndex) => ({
      sessionIndex,
      cueIndex,
      entityId: cue.entity_id,
      entry: admission.byId.get(cue.entity_id)!,
    })),
  );
  const newCount = slots.filter((slot) => !previous.has(slot.entityId)).length;
  const needed = Math.ceil((MIN_NEW_PERCENT * slots.length) / 100) - newCount;
  if (previous.size === 0 || needed <= 0) return { sessions: [...sessions], repairs: [] };

  const used = new Set(slots.map((slot) => slot.entityId));
  const available = ctx.registry
    .filter((entry) => !previous.has(entry.entityId) && admission.verdict(entry.entityId).ok)
    .sort((a, b) => affinityOf(b) - affinityOf(a));
  const repeats = slots
    .filter((slot) => previous.has(slot.entityId))
    .sort((a, b) => affinityOf(a.entry) - affinityOf(b.entry));

  const swaps = new Map<string, RegistryEntry>();
  for (const repeat of repeats) {
    if (swaps.size >= needed) break;
    const replacement = available.find(
      (entry) => entry.domain === repeat.entry.domain && !used.has(entry.entityId),
    );
    if (replacement === undefined) continue;
    used.add(replacement.entityId);
    swaps.set(`${repeat.sessionIndex}:${repeat.cueIndex}`, replacement);
  }

  const repairs: Repair[] = [];
  const swapped = sessions.map((session, sessionIndex) => ({
    ...session,
    cues: session.cues.map((cue, cueIndex) => {
      const replacement = swaps.get(`${sessionIndex}:${cueIndex}`);
      if (replacement === undefined) return cue;
      repairs.push({ step: "novelty", reason: "novelty_swap", sessionIndex, field: `cues[${cueIndex}]` });
      return vettedCue(replacement, ctx, sessionIndex + cueIndex);
    }),
  }));
  return { sessions: swapped, repairs };
}
