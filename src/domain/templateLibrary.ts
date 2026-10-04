import type { Domain, Stage } from "@/contracts/primitives";

/** A vetted Session title with its theme line. Both are heading-scope strings. */
export interface TitleTheme {
  readonly title: string;
  readonly theme: string;
}

/**
 * Vetted replacement strings (PLAN section 3.2 step 5, R12). The shape lives
 * in `domain` so the pure validator can receive a library through its context
 * instead of importing `src/agent/templates.ts` (ticket 09, layering decision).
 * Every string may use the `{name}` placeholder, filled on the device only.
 */
export interface TemplateLibrary {
  /** Open, failure-free Prompts: at least 3 per Domain x Stage. */
  readonly prompts: Readonly<Record<Domain, Readonly<Record<Stage, readonly string[]>>>>;
  /** Sensory activities: at least 6 per Stage. */
  readonly sensoryActivities: Readonly<Record<Stage, readonly string[]>>;
  /** Session titles with themes: at least 8. */
  readonly titleThemes: readonly TitleTheme[];
  /** Caregiver tips: at least 3 per Stage. */
  readonly caregiverTips: Readonly<Record<Stage, readonly string[]>>;
  /** Provenance-safe "why this" lines, one per Domain. */
  readonly whyThis: Readonly<Record<Domain, string>>;
}
