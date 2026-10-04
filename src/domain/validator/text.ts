/**
 * Step 6 of `validateKit` (PLAN section 3.2 step 5, FR-12 deviation): run
 * `checkText` on every string the model wrote, with its scope, and replace each
 * failing string from the vetted templates instead of regenerating it. A string
 * over its contract limit, or blank, is replaced the same way.
 */
import { checkText, type TextCheckContext, type TextScope } from "@/domain/checkText";
import { wordCount, SESSION_FORMATS } from "@/domain/sessionFormats";
import { LIMITS } from "@/domain/validator/limits";
import { pickTemplate } from "@/domain/validator/pick";
import type {
  Repair,
  RepairReason,
  ValidatedCue,
  ValidatedSession,
  ValidationContext,
} from "@/domain/validator/types";

/** What `checkText` may treat as a known name, and which terms it must refuse, for this run. */
export function textGuard(ctx: ValidationContext): TextCheckContext {
  const excludedEntityLabels = ctx.profile.exclusions
    .filter((exclusion) => exclusion.kind === "entity")
    .map((exclusion) => exclusion.label);
  return {
    registryNames: ctx.registry.map((entry) => entry.name),
    seedNames: ctx.profile.seeds.map((seed) => seed.name),
    learnedFavoriteNames: ctx.profile.learnedFavorites.map((favorite) => favorite.name),
    fingerprintTagNames: ctx.fingerprintTagNames,
    places: ctx.places,
    avoidTopics: [...ctx.profile.avoidTopics, ...excludedEntityLabels],
    sensitiveThemesOptIn: ctx.sensitiveThemesOptIn,
  };
}

interface Failure {
  readonly reason: RepairReason;
  readonly rules?: readonly string[];
}

/** Why `text` may not be shown, or undefined when it may. */
function failureOf(text: string, scope: TextScope, limit: number, guard: TextCheckContext): Failure | undefined {
  if (text.trim() === "") return { reason: "empty_text" };
  const issues = checkText(text, scope, guard);
  if (issues.length > 0) {
    return { reason: "failed_text_check", rules: [...new Set(issues.map((issue) => issue.rule))] };
  }
  return text.length > limit ? { reason: "too_long" } : undefined;
}

const repairFor = (sessionIndex: number, field: string, failure: Failure): Repair => ({
  step: "text",
  reason: failure.reason,
  sessionIndex,
  field,
  ...(failure.rules === undefined ? {} : { rules: failure.rules }),
});

interface Vetted<T> {
  readonly value: T;
  readonly repairs: readonly Repair[];
}

interface ListSpec {
  readonly sessionIndex: number;
  readonly field: string;
  readonly limit: number;
  readonly guard: TextCheckContext;
  /** Picks a replacement given what the list already holds. */
  readonly replacement: (taken: readonly string[], salt: number) => string;
}

/** Vets each string of a list body-scope; replacements never repeat a string in the list. */
function vetList(items: readonly string[], spec: ListSpec): Vetted<string[]> {
  const repairs: Repair[] = [];
  const taken = [...items];
  const value = items.map((text, index) => {
    const failure = failureOf(text, "body", spec.limit, spec.guard);
    if (failure === undefined) return text;
    const replacement = spec.replacement(taken, spec.sessionIndex + index);
    taken.push(replacement);
    repairs.push(repairFor(spec.sessionIndex, `${spec.field}[${index}]`, failure));
    return replacement;
  });
  return { value, repairs };
}

function vetCue(
  cue: ValidatedCue,
  cueIndex: number,
  sessionIndex: number,
  ctx: ValidationContext,
  guard: TextCheckContext,
): Vetted<ValidatedCue> {
  const field = `cues[${cueIndex}]`;
  const salt = sessionIndex + cueIndex;
  const rule = SESSION_FORMATS[ctx.stage];
  const fitsStage = (prompt: string) =>
    wordCount(prompt) <= rule.maxWordsPerPrompt && prompt.length <= LIMITS.prompt;

  const whyFailure = failureOf(cue.whyThis, "body", LIMITS.whyThis, guard);
  const prompts = vetList(cue.prompts, {
    sessionIndex,
    field: `${field}.prompts`,
    limit: LIMITS.prompt,
    guard,
    replacement: (taken, offset) =>
      pickTemplate(ctx.templates.prompts[cue.domain][ctx.stage], taken, salt + offset, fitsStage),
  });
  const repairs = [
    ...(whyFailure === undefined ? [] : [repairFor(sessionIndex, `${field}.whyThis`, whyFailure)]),
    ...prompts.repairs,
  ];
  return {
    value: {
      ...cue,
      whyThis: whyFailure === undefined ? cue.whyThis : ctx.templates.whyThis[cue.domain],
      prompts: prompts.value,
    },
    repairs,
  };
}

/** The title and theme as a pair: a failing heading is replaced by a vetted pair, so they stay coherent. */
function vetHeadings(
  session: ValidatedSession,
  sessionIndex: number,
  ctx: ValidationContext,
  guard: TextCheckContext,
  titlesInUse: readonly string[],
): Vetted<Pick<ValidatedSession, "title" | "theme">> {
  const titleFailure = failureOf(session.title, "heading", LIMITS.title, guard);
  const themeFailure = failureOf(session.theme, "heading", LIMITS.theme, guard);
  const failure = titleFailure ?? themeFailure;
  if (failure === undefined) return { value: { title: session.title, theme: session.theme }, repairs: [] };

  const pairs = ctx.templates.titleThemes;
  const titles = pairs.map((pair) => pair.title);
  const chosen = pairs[titles.indexOf(pickTemplate(titles, titlesInUse, sessionIndex))]!;
  return {
    value: { title: chosen.title, theme: chosen.theme },
    repairs: [
      repairFor(sessionIndex, "title", titleFailure ?? failure),
      repairFor(sessionIndex, "theme", themeFailure ?? failure),
    ],
  };
}

/** Vets every model string of every Session (step 6). Pure: returns new Sessions. */
export function vetText(
  sessions: readonly ValidatedSession[],
  ctx: ValidationContext,
): Vetted<ValidatedSession[]> {
  const guard = textGuard(ctx);
  const repairs: Repair[] = [];
  const titlesInUse = sessions.map((session) => session.title);

  const value = sessions.map((session, sessionIndex) => {
    const headings = vetHeadings(session, sessionIndex, ctx, guard, titlesInUse);
    titlesInUse[sessionIndex] = headings.value.title;
    const sensory = vetList(session.sensoryActivities, {
      sessionIndex,
      field: "sensoryActivities",
      limit: LIMITS.sensoryActivity,
      guard,
      replacement: (taken, salt) => pickTemplate(ctx.templates.sensoryActivities[ctx.stage], taken, salt),
    });
    const tips = vetList(session.caregiverTips, {
      sessionIndex,
      field: "caregiverTips",
      limit: LIMITS.caregiverTip,
      guard,
      replacement: (taken, salt) => pickTemplate(ctx.templates.caregiverTips[ctx.stage], taken, salt),
    });
    const cues = session.cues.map((cue, cueIndex) => vetCue(cue, cueIndex, sessionIndex, ctx, guard));
    repairs.push(
      ...headings.repairs,
      ...sensory.repairs,
      ...tips.repairs,
      ...cues.flatMap((cue) => cue.repairs),
    );
    return {
      ...session,
      ...headings.value,
      sensoryActivities: sensory.value,
      caregiverTips: tips.value,
      cues: cues.map((cue) => cue.value),
    };
  });

  return { value, repairs };
}
