import { z } from "zod";
import { Domain, Id, ImageUrl, Place, Stage, StoryId } from "./primitives";

/** A remembered favorite that has been confirmed as a specific Qloo entity. */
export const Seed = z.object({
  entityId: Id,
  name: z.string().max(120),
  domain: Domain,
  year: z.number().int().optional(),
  imageUrl: ImageUrl.nullable(),
});

/** Something that must never appear: an entity, a Qloo tag, or a free-text topic. */
export const AvoidItem = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("entity"), entityId: Id, name: z.string().max(120), domain: Domain }),
  z.object({ kind: z.literal("tag"), tagId: Id, name: z.string().max(80) }),
  z.object({ kind: z.literal("topic"), text: z.string().trim().min(2).max(60) }),
]);

/** What the Caregiver knows about the Person. Lives only in the browser (ADR 0001). */
export const LifeStory = z.object({
  id: StoryId,
  firstName: z
    .string()
    .trim()
    .min(1)
    .max(30)
    .regex(/^[\p{L}'-]+$/u),
  birthYear: z.number().int().min(1920).max(1975),
  hometown: Place,
  youngAdultCity: Place.optional(),
  careLocation: Place.optional(),
  heritage: z.string().max(60).optional(),
  language: z.string().max(40).optional(),
  occupation: z.string().max(60).optional(),
  seeds: z.array(Seed).min(2).max(5),
  avoidList: z.array(AvoidItem).max(10),
  dementiaStage: Stage,
  sensitiveThemesOptIn: z.boolean().default(false),
  createdAt: z.iso.datetime(),
});

/** The single resumable wizard draft (step 1..6). */
export const LifeStoryDraft = z.object({
  step: z.number().int().min(1).max(6),
  values: LifeStory.partial(),
  updatedAt: z.iso.datetime(),
});

/**
 * The only form of a Life Story that leaves the device. Strict: it has no
 * `firstName` key, so a stray name fails validation instead of passing through.
 */
export const LifeStoryDigest = LifeStory.omit({
  id: true,
  firstName: true,
  createdAt: true,
  seeds: true,
  avoidList: true,
})
  .extend({
    seedNames: z.array(z.string().max(120)).max(5),
    avoidTopics: z.array(z.string().max(60)).max(10),
  })
  .strict();

export type Seed = z.infer<typeof Seed>;
export type AvoidItem = z.infer<typeof AvoidItem>;
export type LifeStory = z.infer<typeof LifeStory>;
export type LifeStoryDraft = z.infer<typeof LifeStoryDraft>;
export type LifeStoryDigest = z.infer<typeof LifeStoryDigest>;
