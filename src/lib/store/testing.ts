import type { Kit, LifeStory, LifeStoryDraft, SessionLogEntry, TasteProfile } from "@/contracts";

/** Small, valid sample data for store tests (builders, not fixtures: each call returns a fresh object). */
export const NOW = "2026-10-03T12:00:00.000Z";
export const UUID_A = "3f1c2a9e-5b7d-4c1e-9a52-0d8f6e4b7a11";
export const UUID_B = "9b2d4c6e-1a3f-4e5d-8b7c-6a5f4e3d2c1b";

export const story = (id: string = UUID_A): LifeStory => ({
  id,
  firstName: "Margaret",
  birthYear: 1946,
  hometown: "Memphis",
  seeds: [
    { entityId: "s1", name: "Seed 1", domain: "music", imageUrl: null },
    { entityId: "s2", name: "Seed 2", domain: "music", imageUrl: null },
  ],
  avoidList: [],
  dementiaStage: "middle",
  sensitiveThemesOptIn: false,
  createdAt: NOW,
});

export const draft = (step: number, values: LifeStoryDraft["values"] = {}): LifeStoryDraft => ({
  step,
  values,
  updatedAt: NOW,
});

export const profile = (): TasteProfile => ({
  version: 0,
  seeds: [
    { entityId: "s1", name: "Seed 1" },
    { entityId: "s2", name: "Seed 2" },
  ],
  learnedFavorites: [],
  exclusions: [],
  avoidTopics: [],
});

export const kit = (n: number, storyId: string = UUID_A): Kit => {
  const cue = (i: number) => ({
    entityId: `e${i}`,
    domain: "music" as const,
    name: `Artist ${i}`,
    imageUrl: null,
    tags: [],
    outsideWindow: false,
    whyThis: "Often loved by people of this era.",
    prompts: ["Tell me about the music you loved."],
    provenance: {
      affinity: 0.5,
      seeds: [],
      signals: { ageBucket: "55_and_older" as const },
      signalsOnly: true,
      cached: false,
      synthetic: true,
      recordedExample: false,
      envelope: "ok" as const,
    },
  });
  const session = (id: string) => ({
    id,
    title: "Sunday Best",
    theme: "Dressing up",
    format: "mixed" as const,
    durationMin: 30,
    sensoryActivities: ["Hum along."],
    caregiverTips: ["Go slowly."],
    cues: [cue(1), cue(2), cue(3)],
  });
  return {
    id: UUID_B,
    storyId: storyIdOf(storyId),
    generation: n,
    createdAt: NOW,
    source: "deterministic",
    window: { start: 1956, end: 1976 },
    widened: [],
    sessions: [session("a"), session("b"), session("c")],
    fingerprint: [],
    notices: [],
    qloo: { calls: 0, cacheHits: 0, agentCalls: 0 },
    omittedDomains: [],
  };
};
export const storyIdOf = (id: string) => id as Kit["storyId"];

export const logEntry = (n: number): SessionLogEntry => ({
  id: UUID_B,
  kitId: UUID_A,
  sessionId: `s${n}`,
  startedAt: NOW,
  reactions: [],
});
