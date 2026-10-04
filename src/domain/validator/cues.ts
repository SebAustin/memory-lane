/**
 * Steps 1-4 of `validateKit` applied to a draft: ground every Cue against the
 * registry, drop the ones that may not appear, drop repeats, and trust the
 * registry's domain over the model's.
 */
import type { Admission } from "@/domain/validator/admit";
import type { DraftCue, DraftSession, Drop, Repair, ValidatedCue, ValidatedSession } from "@/domain/validator/types";

export interface CueFilterResult {
  readonly sessions: readonly ValidatedSession[];
  readonly drops: readonly Drop[];
  readonly repairs: readonly Repair[];
}

/** Keeps only the fields the draft contract has, in a fixed order. */
function rebuild(cue: DraftCue, domain: DraftCue["domain"]): ValidatedCue {
  return { entity_id: cue.entity_id, domain, whyThis: cue.whyThis, prompts: cue.prompts };
}

/** Drops Cues that fail steps 1-4 and returns the surviving, rebuilt Cues. */
export function filterCues(sessions: readonly DraftSession[], admission: Admission): CueFilterResult {
  const seen = new Set<string>();
  const drops: Drop[] = [];
  const repairs: Repair[] = [];

  const kept = sessions.map((session, sessionIndex) => {
    const cues: ValidatedCue[] = [];
    session.cues.forEach((cue, cueIndex) => {
      const verdict = admission.verdict(cue.entity_id);
      if (!verdict.ok) {
        drops.push({ step: verdict.step, reason: verdict.reason, sessionIndex, entityId: cue.entity_id });
        return;
      }
      if (seen.has(cue.entity_id)) {
        drops.push({ step: "duplicates", reason: "duplicate_cue", sessionIndex, entityId: cue.entity_id });
        return;
      }
      seen.add(cue.entity_id);
      if (cue.domain !== verdict.entry.domain) {
        repairs.push({
          step: "grounding",
          reason: "domain_corrected",
          sessionIndex,
          field: `cues[${cueIndex}].domain`,
        });
      }
      cues.push(rebuild(cue, verdict.entry.domain));
    });
    return { ...session, cues };
  });

  return { sessions: kept, drops, repairs };
}

/**
 * Sets `outsideWindow: true` on every Cue that sits inside a widened Window but
 * outside the ORIGINAL one, and removes the key everywhere else, whatever the
 * model wrote. Era fit is always measured against the original Window (R2).
 */
export function flagOutsideWindow<S extends { readonly cues: readonly ValidatedCue[] }>(
  sessions: readonly S[],
  admission: Admission,
): S[] {
  return sessions.map((session) => ({
    ...session,
    cues: session.cues.map((cue) => {
      const entry = admission.byId.get(cue.entity_id);
      const flagged = entry !== undefined && admission.isOutsideOriginalWindow(entry);
      return flagged ? { ...rebuild(cue, cue.domain), outsideWindow: true as const } : rebuild(cue, cue.domain);
    }),
  }));
}
