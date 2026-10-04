import { z } from "./z";
import { Id, StoryId, WidenableDomain } from "./primitives";
import { LifeStoryDigest } from "./life-story";
import { TasteProfile } from "./taste";

/** `POST /api/kit` body. Strict: unknown keys (a stray first name) are rejected. */
export const KitRequest = z
  .object({
    storyId: StoryId,
    digest: LifeStoryDigest,
    profile: TasteProfile,
    generation: z.number().int().min(1),
    mode: z.enum(["replay", "live"]).default("live"),
    widen: z.array(WidenableDomain).max(3).default([]),
    previousCueIds: z.array(Id).max(32).default([]),
  })
  .strict();

/** `POST /api/baseline` body. */
export const BaselineRequest = z
  .object({
    storyId: StoryId,
    digest: LifeStoryDigest,
    mode: z.enum(["replay", "live"]).default("live"),
  })
  .strict();

export type KitRequest = z.infer<typeof KitRequest>;
export type BaselineRequest = z.infer<typeof BaselineRequest>;
