/**
 * Gentle PII hints for the Life Story wizard (FR-3, NFR-11). The app only
 * needs a first name, a place and a few favorites, so it nudges the Caregiver
 * when text looks like a surname, a street address or a diagnosis.
 *
 * These are heuristics, never gates: a hint never blocks anything, and a miss
 * is covered by the real safeguard, which is that the name and free text are
 * scrubbed before anything leaves the device (PLAN section 7). Pure and
 * dependency-free, so it runs on both client and server.
 */

export type PiiKind = "surname" | "address" | "diagnosis";

export interface PiiFinding {
  readonly kind: PiiKind;
  /** The text that matched, so a caller can point at it. Never log it. */
  readonly match: string;
  /** Where the match starts in the input. */
  readonly index: number;
}

export interface DetectOptions {
  /** Look only for these kinds. Each field asks for what makes sense there: "New Orleans" is not a surname. */
  readonly kinds?: readonly PiiKind[];
}

const CAP_WORD = String.raw`\p{Lu}[\p{L}\p{M}'’-]+`;
const STREET_SUFFIX =
  "Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Court|Ct|Boulevard|Blvd|Way|Place|Pl|Terrace|Close|Crescent|Circle|Cir|Highway|Hwy";
const DIAGNOSIS_TERMS = [
  "dementia",
  "alzheimer['’]?s?",
  "parkinson['’]?s?",
  String.raw`lewy\s+bod(?:y|ies)`,
  "frontotemporal",
  "stroke",
  "cancer",
  "diabetes",
  "depress(?:ion|ed)",
  "anxiety",
  "schizophrenia",
  "bipolar",
  "epilepsy",
  "copd",
  "diagnos(?:is|ed|es)",
  "prognosis",
  "hospice",
  String.raw`cognitive\s+impairment`,
  String.raw`heart\s+(?:failure|disease|attack)`,
  "incontinen(?:t|ce)",
].join("|");

const PATTERNS: Readonly<Record<PiiKind, readonly RegExp[]>> = {
  surname: [
    new RegExp(String.raw`\b(?:Mr|Mrs|Ms|Miss|Mx|Dr)\.?\s+${CAP_WORD}`, "u"),
    new RegExp(String.raw`${CAP_WORD}(?: +${CAP_WORD})+`, "u"),
    new RegExp(String.raw`${CAP_WORD} +\p{Lu}\.`, "u"),
  ],
  address: [
    new RegExp(String.raw`\b\d{1,5}\s+(?:[\p{L}.'’-]+\s+){0,3}(?:${STREET_SUFFIX})\b\.?`, "iu"),
    /\bP\.?\s?O\.?\s+Box\s+\d+/i,
    /\b(?:Apt|Apartment|Unit|Suite|Ste|Room|Rm|Flat)\.?\s*#?\s*\d+[A-Za-z]?\b/i,
    /\b\d{5}(?:-\d{4})?\b/,
    /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/,
  ],
  diagnosis: [new RegExp(String.raw`\b(?:${DIAGNOSIS_TERMS})\b`, "iu")],
};

const ALL_KINDS: readonly PiiKind[] = ["surname", "address", "diagnosis"];

function firstMatch(kind: PiiKind, text: string): PiiFinding | null {
  let best: PiiFinding | null = null;
  for (const pattern of PATTERNS[kind]) {
    const found = pattern.exec(text);
    if (found !== null && (best === null || found.index < best.index)) {
      best = { kind, match: found[0], index: found.index };
    }
  }
  return best;
}

/**
 * Finds text that looks like a surname, an address or a diagnosis. Returns at
 * most one finding per kind, in reading order, so the UI can show one calm hint
 * for each. An empty list means nothing stood out.
 */
export function detectPiiRisk(text: string, { kinds = ALL_KINDS }: DetectOptions = {}): PiiFinding[] {
  if (text.trim() === "") return [];
  return kinds
    .map((kind) => firstMatch(kind, text))
    .filter((finding): finding is PiiFinding => finding !== null)
    .sort((a, b) => a.index - b.index);
}
