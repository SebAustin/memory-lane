import { z } from "./z";
import { StoryId } from "./primitives";
import { Cue, Notice } from "./kit";

/**
 * The interim `/api/kit` answer (tickets 02-04): music Cues plus notices.
 * Ticket 15 replaces it with the streamed Kit. Shared so the browser can
 * check the response it receives at the boundary.
 */
export const InterimKit = z.object({
  storyId: StoryId,
  status: z.enum(["ok", "empty", "needs_input", "partial", "degraded", "error"]),
  cues: z.array(Cue),
  notices: z.array(Notice),
});
export type InterimKit = z.infer<typeof InterimKit>;
