import { z } from "./z";
import { StoryId } from "./primitives";
import { Kit } from "./kit";
import { LifeStory, LifeStoryDraft } from "./life-story";
import { SessionLogEntry } from "./session-log";
import { TasteProfile } from "./taste";

/** Everything the browser persists, under one versioned key (ADR 0001). */
export const StoreV1 = z.object({
  schemaVersion: z.literal(1),
  lifeStories: z.array(LifeStory).max(10),
  draft: LifeStoryDraft.nullable(),
  profiles: z.record(z.string(), TasteProfile),
  kits: z.record(z.string(), z.array(Kit).max(6)),
  sessionLogs: z.record(z.string(), z.array(SessionLogEntry).max(50)),
  activeStoryId: StoryId.nullable(),
});

export const ExportFile = z.object({
  app: z.literal("memory-lane"),
  schemaVersion: z.number().int(),
  exportedAt: z.iso.datetime(),
  data: StoreV1,
});

export type StoreV1 = z.infer<typeof StoreV1>;
export type ExportFile = z.infer<typeof ExportFile>;
