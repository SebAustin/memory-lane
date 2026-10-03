/**
 * The album's rhythm: which Cue cards tilt, which are taped down, which is the
 * featured spread. Deterministic by index, so server and client render alike.
 * Session Mode ignores all of this (`[data-surface="session"]` zeroes the tilts).
 */
export type Tilt = "a" | "b" | "c" | "none";

export interface CardRhythm {
  readonly tilt: Tilt;
  readonly taped: boolean;
  readonly featured: boolean;
}

/** Seven steps, so the pattern never lines up with a 2, 3 or 4-column grid. */
const TILTS: readonly Tilt[] = ["a", "b", "none", "c", "b", "a", "none"];
const TAPE_EVERY = 4;
const TAPE_OFFSET = 1;

export function cardRhythm(index: number): CardRhythm {
  return {
    tilt: TILTS[index % TILTS.length] ?? "none",
    taped: index % TAPE_EVERY === TAPE_OFFSET,
    featured: index === 0,
  };
}
