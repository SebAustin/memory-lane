import { z } from "./z";
import { Domain, Id } from "./primitives";
import { Seed } from "./life-story";

/** Longest query we send to Qloo for an entity search or a topic (PLAN 5.4). */
export const MAX_ENTITY_QUERY = 80;
export const MAX_TAG_QUERY = 60;

/**
 * `POST /api/resolve` body. The text was already scrubbed of the first name in
 * the browser; the server only checks its shape and length.
 */
export const ResolveRequest = z
  .object({
    kind: z.enum(["entity", "tag"]),
    query: z.string().trim().min(2).max(MAX_ENTITY_QUERY),
    domain: Domain.optional(),
  })
  .strict()
  .refine((request) => request.kind === "entity" || request.query.length <= MAX_TAG_QUERY, {
    path: ["query"],
    message: `A topic is at most ${MAX_TAG_QUERY} characters`,
  });

/** An entity the Caregiver may confirm as a Seed or an Avoid List item. */
export const SeedCandidate = Seed.extend({
  /** One short line from Qloo ("American singer and actress"), to tell look-alikes apart. */
  description: z.string().max(160).optional(),
});

export const TagCandidate = z.object({ id: Id, name: z.string().max(80) });

const STATUS = z.enum(["ok", "empty", "needs_input", "partial", "degraded", "error"]);

const response = <T extends z.ZodType>(candidate: T) =>
  z.object({
    status: STATUS,
    data: z.array(candidate).max(5).nullable(),
    hint: z.string().max(200).optional(),
    errorCode: z.string().max(40).optional(),
  });

/** What `/api/resolve` answers: an Envelope without provenance (which can hold query text). */
export const EntityResolveResponse = response(SeedCandidate);
export const TagResolveResponse = response(TagCandidate);

export type ResolveRequest = z.infer<typeof ResolveRequest>;
export type SeedCandidate = z.infer<typeof SeedCandidate>;
export type TagCandidate = z.infer<typeof TagCandidate>;
export type EntityResolveResponse = z.infer<typeof EntityResolveResponse>;
export type TagResolveResponse = z.infer<typeof TagResolveResponse>;
