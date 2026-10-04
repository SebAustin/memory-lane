/**
 * Stage fit (PLAN section 3.2 step 6, SC-7, FR-6): make one Session obey the
 * format its Dementia Stage calls for. It sets the format, trims Prompts to the
 * cap, replaces over-long Prompts from the vetted templates, tops up sensory
 * activities and caregiver tips, trims Cues beyond the stage maximum and clamps
 * the duration. Pure: it returns a new Session and never mutates its input.
 */
import type { Stage } from "@/contracts";
import { SESSION_FORMATS, wordCount } from "@/domain/sessionFormats";
import type { TemplateLibrary } from "@/domain/templateLibrary";
import { LIMITS } from "@/domain/validator/limits";
import { pickTemplate } from "@/domain/validator/pick";
import type { Drop, Repair, RepairReason, ValidatedCue, ValidatedSession } from "@/domain/validator/types";

export interface StageFitOptions {
  readonly stage: Stage;
  readonly templates: TemplateLibrary;
  readonly sessionIndex: number;
}

export interface StageFitResult {
  readonly session: ValidatedSession;
  readonly repairs: readonly Repair[];
  readonly drops: readonly Drop[];
}

interface Fitted<T> {
  readonly value: T;
  readonly repairs: readonly Repair[];
}

const stageRepair = (sessionIndex: number, reason: RepairReason, field: string): Repair => ({
  step: "stage_fit",
  reason,
  sessionIndex,
  field,
});

/** Trims to `max`, then tops up to `min` from `pool`, never repeating a string. */
function fitCount(
  items: readonly string[],
  bounds: { readonly min: number; readonly max: number },
  pool: readonly string[],
  salt: number,
): { readonly value: string[]; readonly trimmed: boolean; readonly toppedUp: boolean } {
  const value = items.slice(0, bounds.max);
  const trimmed = value.length < items.length;
  const before = value.length;
  while (value.length < bounds.min) value.push(pickTemplate(pool, value, salt + value.length));
  return { value, trimmed, toppedUp: value.length > before };
}

function fitCue(cue: ValidatedCue, cueIndex: number, opts: StageFitOptions): Fitted<ValidatedCue> {
  const rule = SESSION_FORMATS[opts.stage];
  const field = `cues[${cueIndex}].prompts`;
  const pool = opts.templates.prompts[cue.domain][opts.stage];
  const fits = (prompt: string) => wordCount(prompt) <= rule.maxWordsPerPrompt && prompt.length <= LIMITS.prompt;
  const repairs: Repair[] = [];
  const salt = opts.sessionIndex + cueIndex;

  const kept = cue.prompts.slice(0, rule.maxPromptsPerCue);
  if (kept.length < cue.prompts.length) repairs.push(stageRepair(opts.sessionIndex, "prompts_trimmed", field));

  const prompts = kept.map((prompt, index) => {
    if (fits(prompt)) return prompt;
    repairs.push(stageRepair(opts.sessionIndex, "prompt_too_many_words", `${field}[${index}]`));
    return pickTemplate(pool, kept, salt + index, fits);
  });
  if (prompts.length === 0) {
    prompts.push(pickTemplate(pool, [], salt, fits));
    repairs.push(stageRepair(opts.sessionIndex, "prompts_topped_up", field));
  }
  return { value: { ...cue, prompts }, repairs };
}

/** Fits one Session to its stage. Cues past the stage maximum are dropped, last first. */
export function fitSessionToStage(session: ValidatedSession, opts: StageFitOptions): StageFitResult {
  const { sessionIndex, stage, templates } = opts;
  const rule = SESSION_FORMATS[stage];
  const repairs: Repair[] = [];

  if (session.format !== rule.format) repairs.push(stageRepair(sessionIndex, "format_set", "format"));

  const rounded = Math.round(session.durationMin);
  const durationMin = Math.min(LIMITS.durationMin.max, Math.max(LIMITS.durationMin.min, rounded));
  if (durationMin !== session.durationMin) repairs.push(stageRepair(sessionIndex, "duration_clamped", "durationMin"));

  const keptCues = session.cues.slice(0, rule.cues.max);
  const drops: Drop[] = session.cues.slice(rule.cues.max).map((cue) => ({
    step: "stage_fit",
    reason: "over_stage_cap",
    sessionIndex,
    entityId: cue.entity_id,
  }));
  const cues = keptCues.map((cue, index) => fitCue(cue, index, opts));

  const sensory = fitCount(
    session.sensoryActivities,
    { min: rule.minSensoryActivities, max: LIMITS.sensoryMax },
    templates.sensoryActivities[stage],
    sessionIndex,
  );
  if (sensory.trimmed) repairs.push(stageRepair(sessionIndex, "sensory_trimmed", "sensoryActivities"));
  if (sensory.toppedUp) repairs.push(stageRepair(sessionIndex, "sensory_topped_up", "sensoryActivities"));

  const tips = fitCount(
    session.caregiverTips,
    { min: 1, max: LIMITS.caregiverTipsMax },
    templates.caregiverTips[stage],
    sessionIndex,
  );
  if (tips.trimmed) repairs.push(stageRepair(sessionIndex, "tips_trimmed", "caregiverTips"));
  if (tips.toppedUp) repairs.push(stageRepair(sessionIndex, "tips_topped_up", "caregiverTips"));

  return {
    session: {
      ...session,
      format: rule.format,
      durationMin,
      sensoryActivities: sensory.value,
      caregiverTips: tips.value,
      cues: cues.map((cue) => cue.value),
    },
    repairs: [...repairs, ...cues.flatMap((cue) => cue.repairs)],
    drops,
  };
}
