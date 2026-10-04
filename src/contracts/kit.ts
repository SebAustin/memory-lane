import { z } from "./z";
import { Domain, Id, ImageUrl, StoryId, WidenableDomain } from "./primitives";
import { Provenance } from "./taste";

/** A single cultural item shown in a Session. Always a Qloo entity (ADR 0003). */
export const Cue = z.object({
  entityId: Id,
  domain: Domain,
  name: z.string(),
  year: z.number().int().optional(),
  imageUrl: ImageUrl.nullable(),
  tags: z.array(z.object({ id: Id, name: z.string() })).max(3),
  outsideWindow: z.boolean(),
  /** Generated text uses the `{name}` placeholder, filled in at render time only. */
  whyThis: z.string().max(160),
  prompts: z.array(z.string().max(140)).min(1).max(3),
  provenance: Provenance,
});

const SessionCore = {
  title: z.string().max(60),
  theme: z.string().max(120),
  format: z.enum(["conversation", "mixed", "sensory"]),
  durationMin: z.number().int().min(20).max(45),
  sensoryActivities: z.array(z.string().max(200)).min(1).max(3),
  caregiverTips: z.array(z.string().max(160)).min(1).max(3),
};

/** What the model may return: ids and text only. Hydrated into a Kit afterwards. */
export const KitDraft = z.object({
  sessions: z
    .array(
      z.object({
        ...SessionCore,
        cues: z
          .array(
            z.object({
              entity_id: Id,
              domain: Domain,
              whyThis: z.string().max(160),
              prompts: z.array(z.string().max(140)).min(1).max(3),
            }),
          )
          .min(3)
          .max(8),
      }),
    )
    .min(3)
    .max(4),
});

/** A Kit written by the model alone (names, no ids). Shown only for comparison. */
export const BaselineKit = z.object({
  sessions: z
    .array(
      z.object({
        ...SessionCore,
        cues: z
          .array(
            z.object({
              name: z.string().max(120),
              year: z.number().int().optional(),
              domain: Domain,
              whyThis: z.string().max(160),
              prompts: z.array(z.string().max(140)).min(1).max(3),
            }),
          )
          .min(3)
          .max(8),
      }),
    )
    .min(3)
    .max(4),
});

export const Session = z.object({
  id: Id,
  ...SessionCore,
  cues: z.array(Cue).min(3).max(8),
});

export const Notice = z.object({
  level: z.enum(["info", "warn", "error"]),
  code: z.enum([
    "recorded",
    "cached",
    "partial",
    "deterministic",
    "cap_reached",
    "rate_limited",
    "omitted_domain",
    "validator_drops",
    "budget",
    "upstream_error",
    "aborted",
    "fixture",
  ]),
  message: z.string().max(160),
  domain: Domain.optional(),
});

export const Kit = z.object({
  id: z.uuid(),
  storyId: StoryId,
  generation: z.number().int().min(1),
  createdAt: z.iso.datetime(),
  source: z.enum(["agent", "deterministic", "recorded"]),
  /** The ORIGINAL Reminiscence Window, never the widened one. */
  window: z.object({ start: z.number(), end: z.number() }),
  widened: z.array(WidenableDomain),
  sessions: z.array(Session).min(3).max(4),
  fingerprint: z.array(z.object({ id: Id, name: z.string(), affinity: z.number() })).max(20),
  notices: z.array(Notice),
  qloo: z.object({ calls: z.number(), cacheHits: z.number(), agentCalls: z.number() }),
  omittedDomains: z.array(Domain),
});

export type Cue = z.infer<typeof Cue>;
export type KitDraft = z.infer<typeof KitDraft>;
export type BaselineKit = z.infer<typeof BaselineKit>;
export type Session = z.infer<typeof Session>;
export type Notice = z.infer<typeof Notice>;
export type Kit = z.infer<typeof Kit>;
