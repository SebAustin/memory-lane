import { z } from "zod";
import { AGE_BUCKET } from "@/domain/window";
import { Domain, Id } from "./primitives";

/** Seeds, Learned Favorites and Exclusions used to ask Qloo for Cues. */
export const TasteProfile = z.object({
  version: z.number().int().min(0),
  seedIds: z.array(Id).min(2).max(5),
  learnedFavorites: z
    .array(
      z.object({
        entityId: Id,
        name: z.string().max(120),
        domain: Domain,
        weight: z.number().int().min(1).max(3),
        fromSessionId: Id,
      }),
    )
    .max(20),
  exclusions: z
    .array(
      z.object({
        kind: z.enum(["entity", "tag"]),
        id: Id,
        label: z.string().max(120),
        source: z.enum(["avoid", "reaction"]),
        addedAt: z.iso.datetime(),
      }),
    )
    .max(100),
  avoidTopics: z.array(z.string().max(60)).max(10),
});

/** Why a Cue was chosen. Phrased as group affinity, never as facts about the Person. */
export const Provenance = z.object({
  affinity: z.number().min(0).max(1),
  seeds: z.array(
    z.object({ entityId: Id, name: z.string(), score: z.number(), learned: z.boolean() }),
  ),
  signals: z.object({
    ageBucket: z.literal(AGE_BUCKET),
    hometown: z.string().optional(),
    careLocation: z.string().optional(),
    window: z.object({ start: z.number(), end: z.number() }).optional(),
    /** Set when the Cue was found by the agent's `expand_theme`. */
    themeTag: z.string().optional(),
  }),
  signalsOnly: z.boolean(),
  cached: z.boolean(),
  synthetic: z.boolean(),
  recordedExample: z.boolean(),
  envelope: z.enum(["ok", "partial", "degraded"]),
});

export type TasteProfile = z.infer<typeof TasteProfile>;
export type Provenance = z.infer<typeof Provenance>;
