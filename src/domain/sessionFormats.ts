import type { Stage } from "@/contracts/primitives";
import { deepFreeze } from "@/lib/deep-freeze";

/** The Session shape a Dementia Stage calls for (PLAN section 3.2, FR-6). */
export interface SessionFormatRule {
  readonly format: "conversation" | "mixed" | "sensory";
  readonly cues: { readonly min: number; readonly max: number };
  readonly maxPromptsPerCue: number;
  readonly maxWordsPerPrompt: number;
  readonly minSensoryActivities: number;
}

/**
 * Early Sessions lead with conversation, middle ones mix, late ones are
 * image- and sense-first with very short Prompts and at least 2 sensory
 * activities.
 */
export const SESSION_FORMATS: Readonly<Record<Stage, SessionFormatRule>> = deepFreeze({
  early: {
    format: "conversation",
    cues: { min: 4, max: 6 },
    maxPromptsPerCue: 3,
    maxWordsPerPrompt: 25,
    minSensoryActivities: 1,
  },
  middle: {
    format: "mixed",
    cues: { min: 4, max: 6 },
    maxPromptsPerCue: 2,
    maxWordsPerPrompt: 18,
    minSensoryActivities: 1,
  },
  late: {
    format: "sensory",
    cues: { min: 3, max: 5 },
    maxPromptsPerCue: 1,
    maxWordsPerPrompt: 12,
    minSensoryActivities: 2,
  },
});

/** Whitespace-separated word count, as used by the per-Prompt cap. */
export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}
