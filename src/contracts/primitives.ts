import { z } from "zod";

/** Opaque entity or tag identifier (Qloo ids, `fx-` fixture ids, local ids). */
export const Id = z.string().min(1).max(64);

/** A place name typed by the Caregiver (Hometown, Care Location...). */
export const Place = z.string().trim().min(2).max(80);

/**
 * An https image URL. Stricter than `z.url()`, which accepts any scheme
 * (including `javascript:`). Hosts are allow-listed separately (CSP, normalizeEntity).
 */
export const ImageUrl = z.url({ protocol: /^https$/ });

export const Domain = z.enum(["music", "film", "tv", "book", "place", "brand"]);
export type Domain = z.infer<typeof Domain>;

/** Domains whose Cues carry a release year and can be widened (PLAN section 5.3). */
export const WidenableDomain = z.enum(["film", "tv", "book"]);

export const Stage = z.enum(["early", "middle", "late"]);
export type Stage = z.infer<typeof Stage>;

/** A Life Story id: a uuid, or the public Demo Person. */
export const StoryId = z.union([z.uuid(), z.literal("demo-margaret")]);
export type StoryId = z.infer<typeof StoryId>;

/**
 * A Seed (or Learned Favorite) as an `{entityId, name}` pair. Ids and names
 * travel together, never as parallel arrays that could drift out of step.
 */
export const SeedRef = z.object({ entityId: Id, name: z.string().max(120) });
export type SeedRef = z.infer<typeof SeedRef>;
