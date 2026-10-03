/**
 * The Reminiscence Window (CONTEXT.md): the years when the Person was roughly
 * 10 to 30 years old, the "reminiscence bump". Pure and dependency-free, so it
 * runs on both client and server.
 */

/** Age cohort sent to Qloo as `signal.demographics.age` (FR-7). */
export const AGE_BUCKET = "55_and_older" as const;

export interface ReminiscenceWindow {
  /** First year of the Window (birth year + 10). */
  readonly start: number;
  /** Last year of the Window (birth year + 30). */
  readonly end: number;
  /** Plain-language label for the Caregiver, for example "1956 to 1976". */
  readonly label: string;
}

/** Birth years the product supports (LifeStory contract). */
export const MIN_BIRTH_YEAR = 1920;
export const MAX_BIRTH_YEAR = 1975;

const WINDOW_START_AGE = 10;
const WINDOW_END_AGE = 30;

/**
 * Computes the ORIGINAL Reminiscence Window for a birth year.
 * Widening (+/- 3 years) is a separate, Caregiver-only step (PLAN R2).
 *
 * @throws RangeError when `birthYear` is not an integer in 1920..1975.
 */
export function reminiscenceWindow(birthYear: number): ReminiscenceWindow {
  if (!Number.isInteger(birthYear) || birthYear < MIN_BIRTH_YEAR || birthYear > MAX_BIRTH_YEAR) {
    throw new RangeError(
      `birthYear must be an integer from ${MIN_BIRTH_YEAR} to ${MAX_BIRTH_YEAR}`,
    );
  }
  const start = birthYear + WINDOW_START_AGE;
  const end = birthYear + WINDOW_END_AGE;
  return Object.freeze({ start, end, label: `${start} to ${end}` });
}
