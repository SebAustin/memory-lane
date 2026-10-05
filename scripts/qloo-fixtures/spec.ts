/**
 * The source the hand-made Qloo fixtures are generated from (ticket 06,
 * PLAN 5.5). One `PersonaSpec` per demo Person (P1 to P5, EVALS section 3):
 * plain text lists of real works, one per line, that `build.ts` turns into
 * Qloo-shaped `fixtures/qloo/fx-*.json` files. Years follow first release or
 * first broadcast; the data is illustrative, never a claim about a person.
 *
 * Line formats (blank lines are ignored):
 * - film, tv and book: `Name | year | Tag, Tag`
 * - music, place and brand: `Name | Tag, Tag`
 * List order is rank order: the first line gets the highest affinity.
 */
export interface PersonaSpec {
  readonly id: "p1" | "p2" | "p3" | "p4" | "p5";
  /** Entity ids of the persona's Seeds. They pick this persona's file when several share a lookup key (brands, fingerprints). */
  readonly seeds: readonly string[];
  /** Hometown spellings the fixtures answer to (matched case-insensitively). */
  readonly locations: readonly string[];
  /** The ORIGINAL Reminiscence Window (birth year + 10 to + 30). */
  readonly window: { readonly min: number; readonly max: number };
  /** The taste fingerprint: tags, strongest first. Cross-domain themes come first. */
  readonly fingerprint: readonly string[];
  readonly music: string;
  readonly film: string;
  readonly tv: string;
  readonly book: string;
  readonly place: string;
  readonly brand: string;
}
