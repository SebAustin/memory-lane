import { LifeStory, type LifeStoryDraft } from "@/contracts";
import { MAX_BIRTH_YEAR, MIN_BIRTH_YEAR, reminiscenceWindow, type ReminiscenceWindow } from "@/domain/window";
import { STEP_COUNT } from "./steps";

/** Everything the wizard asks so far, as the text the Caregiver typed. */
export type FieldName =
  | "firstName"
  | "birthYear"
  | "hometown"
  | "youngAdultCity"
  | "careLocation"
  | "heritage"
  | "language"
  | "occupation";

/** Steps 4-6 have no text fields of their own; their problems are keyed to the control that needs attention. */
export type LaterStepKey = "seeds" | "avoidEntity" | "avoidTopic" | "dementiaStage";
/** Anything an error can point at: a text field, or a control on steps 4-6. */
export type ErrorKey = FieldName | LaterStepKey;

export type FormValues = Readonly<Record<FieldName, string>>;
export type FieldErrors = Readonly<Partial<Record<ErrorKey, string>>>;
export type DraftValues = LifeStoryDraft["values"];

/** Text typed on steps 4-6 that has not been matched or added yet, by control. */
export type PendingText = Readonly<Partial<Record<"seeds" | "avoidEntity" | "avoidTopic", string>>>;

export const MIN_SEEDS = 2;
export const MAX_SEEDS = 5;
export const MAX_AVOID_ITEMS = 10;

/** The words the Caregiver sees for each field, from UX section 3. Used by the inputs and the error summary. */
export const FIELD_LABEL: Readonly<Record<FieldName, string>> = {
  firstName: "First name",
  birthYear: "Year they were born",
  hometown: "Where they grew up",
  youngAdultCity: "Where they lived as a young adult",
  careLocation: "Where they live now (for outings)",
  heritage: "Heritage",
  language: "Language they spoke growing up",
  occupation: "Work they did",
};

/** What the error summary calls the controls on steps 4-6. */
export const LATER_STEP_LABEL: Readonly<Record<LaterStepKey, string>> = {
  seeds: "Favorites",
  avoidEntity: "Avoid List: people, songs, films and places",
  avoidTopic: "Avoid List: topics",
  dementiaStage: "Dementia Stage",
};

/** Every error key, labelled, in the order a step shows them. */
export const ERROR_LABEL: Readonly<Record<ErrorKey, string>> = { ...FIELD_LABEL, ...LATER_STEP_LABEL };

const LATER_STEP_KEYS: Readonly<Record<number, readonly LaterStepKey[]>> = {
  4: ["seeds"],
  5: ["avoidEntity", "avoidTopic"],
  6: ["dementiaStage"],
};

/** The controls a step can raise an error on, in page order. */
export const errorKeysOfStep = (step: number): readonly ErrorKey[] =>
  STEP_FIELDS[step] ?? LATER_STEP_KEYS[step] ?? [];

export const EMPTY_FORM: FormValues = {
  firstName: "",
  birthYear: "",
  hometown: "",
  youngAdultCity: "",
  careLocation: "",
  heritage: "",
  language: "",
  occupation: "",
};

/** Which text fields each step owns. Steps 4-6 keep their answers as structured draft values instead. */
const STEP_FIELDS: Readonly<Record<number, readonly FieldName[]>> = {
  1: ["firstName", "birthYear"],
  2: ["hometown", "youngAdultCity", "careLocation"],
  3: ["heritage", "language", "occupation"],
};

const REQUIRED: ReadonlySet<FieldName> = new Set(["firstName", "birthYear", "hometown"]);

const REQUIRED_MESSAGE: Readonly<Partial<Record<FieldName, string>>> = {
  firstName: "Enter their first name.",
  birthYear: "Enter the year they were born.",
  hometown: "Enter where they grew up.",
};

export const fieldsOfStep = (step: number): readonly FieldName[] => STEP_FIELDS[step] ?? [];

const isDigits = (text: string): boolean => /^\d+$/.test(text);

/** Hands the shared schema a number when the text is one, and the text when it is not (so the schema objects). */
function candidate(field: FieldName, raw: string): unknown {
  const text = raw.trim();
  if (field === "birthYear") return isDigits(text) ? Number(text) : text;
  return text;
}

interface IssueLike {
  readonly code: string;
  readonly minimum?: unknown;
  readonly maximum?: unknown;
}

function messageFor(field: FieldName, raw: string, issue: IssueLike): string {
  const required = REQUIRED_MESSAGE[field];
  if (raw.trim() === "" && required !== undefined) return required;
  if (field === "birthYear") {
    return issue.code === "invalid_type" || raw.trim().length !== 4 || !isDigits(raw.trim())
      ? "Use a four-digit year, like 1946."
      : `Birth year needs to be between ${MIN_BIRTH_YEAR} and ${MAX_BIRTH_YEAR}.`;
  }
  if (issue.code === "too_big") return `Keep this to ${String(issue.maximum)} characters or fewer.`;
  if (issue.code === "too_small") return `Use at least ${String(issue.minimum)} letters.`;
  return field === "firstName" ? "Use letters, apostrophes and hyphens only." : "Check this one and try again.";
}

export interface StepParse {
  /** The fields that passed, cleaned up by the shared schema. */
  readonly values: DraftValues;
  /** Plain-language messages for the fields that did not. */
  readonly errors: FieldErrors;
}

/**
 * Checks one step's fields against the shared `LifeStory` schema, one field at
 * a time, so a good field is kept when its neighbour is wrong. Empty optional
 * fields are left out. Steps with no fields yet pass.
 */
export function parseStepFields(step: number, form: FormValues): StepParse {
  let values: DraftValues = {};
  let errors: FieldErrors = {};
  for (const field of fieldsOfStep(step)) {
    const raw = form[field];
    if (raw.trim() === "" && !REQUIRED.has(field)) continue;
    const parsed = LifeStory.pick({ [field]: true } as Record<FieldName, true>).safeParse({
      [field]: candidate(field, raw),
    });
    if (parsed.success) values = { ...values, ...parsed.data };
    else errors = { ...errors, [field]: messageFor(field, raw, parsed.error.issues[0] ?? { code: "custom" }) };
  }
  return { values, errors };
}

/** Fills the form from a saved draft. Numbers become the text a Caregiver would type. */
export function formFromDraft(values: DraftValues | undefined): FormValues {
  if (values === undefined) return EMPTY_FORM;
  const text = (value: string | number | undefined): string => (value === undefined ? "" : String(value));
  return {
    firstName: text(values.firstName),
    birthYear: text(values.birthYear),
    hometown: text(values.hometown),
    youngAdultCity: text(values.youngAdultCity),
    careLocation: text(values.careLocation),
    heritage: text(values.heritage),
    language: text(values.language),
    occupation: text(values.occupation),
  };
}

/** Replaces one step's fields in the draft. A field left empty is removed, not kept. */
export function mergeStepValues(previous: DraftValues, step: number, stepValues: DraftValues): DraftValues {
  const owned = new Set<string>(fieldsOfStep(step));
  const kept = Object.fromEntries(Object.entries(previous).filter(([key]) => !owned.has(key)));
  return { ...kept, ...stepValues };
}

/**
 * The furthest step a draft allows: steps 1 and 2 must be complete before the
 * Seeds step, and 2 confirmed Seeds before anything beyond it.
 */
export function maxReachableStep(values: DraftValues): number {
  const asForm = formFromDraft(values);
  if (Object.keys(parseStepFields(1, asForm).errors).length > 0) return 1;
  if (Object.keys(parseStepFields(2, asForm).errors).length > 0) return 2;
  if ((values.seeds?.length ?? 0) < MIN_SEEDS) return 4;
  return STEP_COUNT;
}

const quoted = (text: string): string => `\u201c${text.trim()}\u201d`;

/**
 * What must hold before Next on steps 4-6 (FR-4, FR-5, FR-6). Text that has not
 * been matched to a Qloo entity, or added as a topic, is never accepted: the
 * Caregiver finishes it or clears the box.
 */
export function validateLaterStep(step: number, values: DraftValues, pending: PendingText): FieldErrors {
  const unmatched = (key: "seeds" | "avoidEntity"): FieldErrors =>
    (pending[key] ?? "").trim() === ""
      ? {}
      : { [key]: `${quoted(pending[key]!)} is not matched yet. Choose Find, or clear the box, to continue.` };

  if (step === 4) {
    const half = unmatched("seeds");
    if (Object.keys(half).length > 0) return half;
    return (values.seeds?.length ?? 0) < MIN_SEEDS ? { seeds: "Choose at least 2 favorites to continue." } : {};
  }
  if (step === 5) {
    const topic = (pending.avoidTopic ?? "").trim();
    return {
      ...unmatched("avoidEntity"),
      ...(topic === ""
        ? {}
        : { avoidTopic: `${quoted(topic)} is not on the list yet. Choose Add topic, or clear the box, to continue.` }),
    };
  }
  if (step === 6) {
    return values.dementiaStage === undefined ? { dementiaStage: "Choose a stage. Not sure? Choose Middle." } : {};
  }
  return {};
}

/** The requested step, or the furthest allowed one when the draft is not ready for it. */
export function firstReachableStep(requested: number, values: DraftValues): number {
  return Math.min(requested, maxReachableStep(values));
}

/** Reads `?step=` strictly: a plain 1-6, nothing else. */
export function parseStepParam(raw: string | null): number | null {
  if (raw === null || !/^[1-6]$/.test(raw)) return null;
  return Number(raw);
}

export interface WindowPreview {
  readonly birthYear: number;
  readonly window: ReminiscenceWindow;
}

/** The Window to preview while the Caregiver types: only for a complete, supported four-digit year (FR-7). */
export function previewWindow(birthYearText: string): WindowPreview | null {
  const text = birthYearText.trim();
  if (!/^\d{4}$/.test(text)) return null;
  const birthYear = Number(text);
  if (birthYear < MIN_BIRTH_YEAR || birthYear > MAX_BIRTH_YEAR) return null;
  return { birthYear, window: reminiscenceWindow(birthYear) };
}
