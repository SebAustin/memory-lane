import { z } from "./z";
import { Id } from "./primitives";

/** The Caregiver's observation of the Person's response to a Cue. */
export const Reaction = z.object({
  cueEntityId: Id,
  sessionId: Id,
  value: z.enum(["engaged", "neutral", "distressed"]),
  at: z.iso.datetime(),
});

export const SessionLogEntry = z.object({
  id: z.uuid(),
  kitId: z.uuid(),
  sessionId: Id,
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime().optional(),
  reactions: z.array(Reaction).max(16),
});

export type Reaction = z.infer<typeof Reaction>;
export type SessionLogEntry = z.infer<typeof SessionLogEntry>;
