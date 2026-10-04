import { z } from "./z";
import { Domain, Id, ImageUrl } from "./primitives";

/** One line of the "Behind the scenes" ledger (PLAN section 4.2). */
export const TraceEvent = z.object({
  id: z.string(),
  atMs: z.number().int(),
  phase: z.enum(["understanding", "asking", "arranging", "checking"]),
  actor: z.enum(["server", "agent", "validator"]),
  status: z.enum(["start", "ok", "empty", "partial", "degraded", "error"]),
  label: z.string().max(140),
  domain: Domain.optional(),
  counts: z
    .object({
      cues: z.number().optional(),
      qlooCalls: z.number(),
      cacheHits: z.number(),
      dropped: z.number().optional(),
    })
    .optional(),
});

/** Candidate photos for the photo pile: registry data only, no generated text. */
export const CandidateBatch = z.object({
  domain: Domain,
  source: z.enum(["prefetch", "expand_theme"]),
  items: z
    .array(z.object({ entityId: Id, name: z.string(), imageUrl: ImageUrl.nullable(), domain: Domain }))
    .max(15),
});

export type TraceEvent = z.infer<typeof TraceEvent>;
export type CandidateBatch = z.infer<typeof CandidateBatch>;
