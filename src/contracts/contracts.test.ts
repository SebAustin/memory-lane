import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import {
  AvoidItem,
  BaselineKit,
  BaselineRequest,
  CandidateBatch,
  Cue,
  ExportFile,
  Kit,
  KitDraft,
  KitRequest,
  LifeStory,
  LifeStoryDigest,
  LifeStoryDraft,
  Notice,
  Provenance,
  Reaction,
  Seed,
  Session,
  SessionLogEntry,
  StoreV1,
  StoryId,
  TasteProfile,
  TraceEvent,
} from "@/contracts";

const NOW = "2026-10-03T12:00:00.000Z";
const UUID = "3f1c2a9e-5b7d-4c1e-9a52-0d8f6e4b7a11";
const UUID_2 = "9b2d4c6e-1a3f-4e5d-8b7c-6a5f4e3d2c1b";

const seed = (n: number) => ({
  entityId: `fx-artist-${n}`,
  name: `Seed ${n}`,
  domain: "music" as const,
  imageUrl: null,
});

const lifeStory = () => ({
  id: "demo-margaret",
  firstName: "Margaret",
  birthYear: 1946,
  hometown: "Memphis",
  seeds: [seed(1), seed(2)],
  avoidList: [{ kind: "topic" as const, text: "Vietnam War" }],
  dementiaStage: "middle" as const,
  createdAt: NOW,
});

const profile = () => ({
  version: 0,
  seedIds: ["fx-artist-1", "fx-artist-2"],
  learnedFavorites: [],
  exclusions: [],
  avoidTopics: ["Vietnam War"],
});

const digest = () => ({
  birthYear: 1946,
  hometown: "Memphis",
  dementiaStage: "middle" as const,
  sensitiveThemesOptIn: false,
  seedNames: ["Patsy Cline", "Pillow Talk"],
  avoidTopics: ["Vietnam War"],
});

const provenance = () => ({
  affinity: 0.8,
  seeds: [{ entityId: "fx-artist-1", name: "Seed 1", score: 0.7, learned: false }],
  signals: { ageBucket: "55_and_older" as const, hometown: "Memphis" },
  signalsOnly: false,
  cached: false,
  synthetic: true,
  recordedExample: false,
  envelope: "ok" as const,
});

const cue = (n = 1) => ({
  entityId: `fx-artist-${n}`,
  domain: "music" as const,
  name: `Artist ${n}`,
  imageUrl: null,
  tags: [{ id: "t1", name: "Country" }],
  outsideWindow: false,
  whyThis: "Often loved by people who share {name}'s era and favorites.",
  prompts: ["Tell me about the music you loved."],
  provenance: provenance(),
});

const sessionCore = () => ({
  title: "Saturday Night at the Pictures, 1962",
  theme: "Going out to the pictures",
  format: "mixed" as const,
  durationMin: 35,
  sensoryActivities: ["Hum along to a favorite tune."],
  caregiverTips: ["Let the music lead."],
});

const session = (id: string) => ({ id, ...sessionCore(), cues: [cue(1), cue(2), cue(3)] });

const draftCue = (n: number) => ({
  entity_id: `fx-artist-${n}`,
  domain: "music" as const,
  whyThis: "Often loved by people of this era.",
  prompts: ["Tell me about the dances you went to."],
});

const kit = () => ({
  id: UUID,
  storyId: "demo-margaret",
  generation: 1,
  createdAt: NOW,
  source: "deterministic" as const,
  window: { start: 1956, end: 1976 },
  widened: [],
  sessions: [session("s1"), session("s2"), session("s3")],
  fingerprint: [{ id: "t1", name: "Country", affinity: 0.9 }],
  notices: [],
  qloo: { calls: 1, cacheHits: 0, agentCalls: 0 },
  omittedDomains: [],
});

const kitRequest = () => ({
  storyId: "demo-margaret",
  digest: digest(),
  profile: profile(),
  generation: 1,
});

/** Asserts a schema accepts `valid` and rejects each labelled invalid value. */
function expectSchema(schema: ZodType, valid: unknown, invalid: Record<string, unknown>) {
  expect(schema.safeParse(valid).success).toBe(true);
  for (const [label, value] of Object.entries(invalid)) {
    expect(schema.safeParse(value).success, label).toBe(false);
  }
}

describe("StoryId", () => {
  it("accepts a uuid and the literal 'demo-margaret'", () => {
    expect(StoryId.safeParse(UUID).success).toBe(true);
    expect(StoryId.safeParse("demo-margaret").success).toBe(true);
  });

  it("rejects any other string", () => {
    expect(StoryId.safeParse("margaret").success).toBe(false);
    expect(StoryId.safeParse("demo-margaret ").success).toBe(false);
    expect(StoryId.safeParse("../etc/passwd").success).toBe(false);
  });
});

describe("Seed and AvoidItem", () => {
  it("validates Seeds", () => {
    expectSchema(Seed, seed(1), {
      "unknown domain": { ...seed(1), domain: "podcast" },
      "empty id": { ...seed(1), entityId: "" },
      "http image": { ...seed(1), imageUrl: "http://example.com/a.jpg" },
      "javascript image": { ...seed(1), imageUrl: "javascript:alert(1)" },
    });
    expect(Seed.safeParse({ ...seed(1), imageUrl: "https://img.example.com/a.jpg" }).success).toBe(
      true,
    );
  });

  it("validates each AvoidItem kind", () => {
    expectSchema(AvoidItem, { kind: "topic", text: "Hospitals" }, {
      "topic too short": { kind: "topic", text: "x" },
      "unknown kind": { kind: "song", text: "Tennessee Waltz" },
      "entity without id": { kind: "entity", name: "x", domain: "music" },
    });
    expect(
      AvoidItem.safeParse({ kind: "entity", entityId: "e1", name: "General Hospital", domain: "tv" })
        .success,
    ).toBe(true);
    expect(AvoidItem.safeParse({ kind: "tag", tagId: "t1", name: "War films" }).success).toBe(true);
  });
});

describe("LifeStory", () => {
  it("validates a Life Story and defaults sensitiveThemesOptIn to false", () => {
    const parsed = LifeStory.parse(lifeStory());
    expect(parsed.sensitiveThemesOptIn).toBe(false);
  });

  it("enforces the first-name, birth-year and Seed-count bounds", () => {
    expectSchema(LifeStory, lifeStory(), {
      "surname with a digit": { ...lifeStory(), firstName: "Margaret2" },
      "full name with a space": { ...lifeStory(), firstName: "Margaret Smith" },
      "too early": { ...lifeStory(), birthYear: 1919 },
      "too late": { ...lifeStory(), birthYear: 1976 },
      "fractional year": { ...lifeStory(), birthYear: 1946.5 },
      "one Seed": { ...lifeStory(), seeds: [seed(1)] },
      "six Seeds": { ...lifeStory(), seeds: [1, 2, 3, 4, 5, 6].map(seed) },
      "bad stage": { ...lifeStory(), dementiaStage: "severe" },
      "bad id": { ...lifeStory(), id: "not-a-story" },
    });
  });

  it("accepts the birth-year edges 1920 and 1975, and apostrophes in names", () => {
    expect(LifeStory.safeParse({ ...lifeStory(), birthYear: 1920 }).success).toBe(true);
    expect(LifeStory.safeParse({ ...lifeStory(), birthYear: 1975 }).success).toBe(true);
    expect(LifeStory.safeParse({ ...lifeStory(), firstName: "D'Arcy" }).success).toBe(true);
  });

  it("allows a partial Life Story only inside a draft", () => {
    expect(LifeStory.safeParse({ firstName: "Margaret" }).success).toBe(false);
    expectSchema(
      LifeStoryDraft,
      { step: 2, values: { firstName: "Margaret" }, updatedAt: NOW },
      { "step 0": { step: 0, values: {}, updatedAt: NOW }, "step 7": { step: 7, values: {}, updatedAt: NOW } },
    );
  });
});

describe("LifeStoryDigest", () => {
  it("accepts the scrubbed digest", () => {
    expect(LifeStoryDigest.safeParse(digest()).success).toBe(true);
  });

  it("rejects a digest that carries the first name (strict)", () => {
    expect(LifeStoryDigest.safeParse({ ...digest(), firstName: "Margaret" }).success).toBe(false);
    expect(LifeStoryDigest.safeParse({ ...digest(), seeds: [] }).success).toBe(false);
  });
});

describe("TasteProfile and Provenance", () => {
  it("validates a TasteProfile", () => {
    expectSchema(TasteProfile, profile(), {
      "one Seed id": { ...profile(), seedIds: ["a"] },
      "weight 4": {
        ...profile(),
        learnedFavorites: [
          { entityId: "e", name: "n", domain: "music", weight: 4, fromSessionId: "s" },
        ],
      },
      "bad exclusion source": {
        ...profile(),
        exclusions: [{ kind: "entity", id: "e", label: "l", source: "guess", addedAt: NOW }],
      },
    });
  });

  it("pins the age bucket to 55_and_older and bounds affinity to 0..1", () => {
    expectSchema(Provenance, provenance(), {
      "other bucket": {
        ...provenance(),
        signals: { ...provenance().signals, ageBucket: "25_to_29" },
      },
      "affinity above 1": { ...provenance(), affinity: 1.2 },
      "unknown envelope": { ...provenance(), envelope: "error" },
    });
  });
});

describe("Cue", () => {
  it("validates a Cue", () => {
    expectSchema(Cue, cue(), {
      "no prompts": { ...cue(), prompts: [] },
      "four prompts": { ...cue(), prompts: ["a", "b", "c", "d"] },
      "whyThis over 160 chars": { ...cue(), whyThis: "x".repeat(161) },
      "four tags": {
        ...cue(),
        tags: [1, 2, 3, 4].map((n) => ({ id: `t${n}`, name: `T${n}` })),
      },
      "missing provenance": { ...cue(), provenance: undefined },
    });
  });
});

describe("KitDraft and BaselineKit", () => {
  const draftSession = () => ({
    ...sessionCore(),
    cues: [draftCue(1), draftCue(2), draftCue(3)],
  });

  it("validates a KitDraft of 3 to 4 Sessions with 3 to 8 Cues each", () => {
    const valid = { sessions: [draftSession(), draftSession(), draftSession()] };
    expectSchema(KitDraft, valid, {
      "two sessions": { sessions: [draftSession(), draftSession()] },
      "five sessions": { sessions: Array.from({ length: 5 }, draftSession) },
      "two cues": { sessions: [1, 2, 3].map(() => ({ ...draftSession(), cues: [draftCue(1), draftCue(2)] })) },
      "duration 10": { sessions: [1, 2, 3].map(() => ({ ...draftSession(), durationMin: 10 })) },
    });
  });

  it("validates a BaselineKit that carries names instead of entity ids", () => {
    const baselineCue = (n: number) => ({
      name: `Song ${n}`,
      year: 1960,
      domain: "music" as const,
      whyThis: "A classic.",
      prompts: ["Tell me about this."],
    });
    const baselineSession = () => ({
      ...sessionCore(),
      cues: [baselineCue(1), baselineCue(2), baselineCue(3)],
    });
    expect(
      BaselineKit.safeParse({ sessions: [baselineSession(), baselineSession(), baselineSession()] })
        .success,
    ).toBe(true);
    expect(
      BaselineKit.safeParse({ sessions: [1, 2, 3].map(() => ({ ...sessionCore(), cues: [draftCue(1), draftCue(2), draftCue(3)] })) })
        .success,
    ).toBe(false);
  });
});

describe("Session, Notice and Kit", () => {
  it("validates a Session", () => {
    expectSchema(Session, session("s1"), {
      "two cues": { ...session("s1"), cues: [cue(1), cue(2)] },
      "no tips": { ...session("s1"), caregiverTips: [] },
      "bad format": { ...session("s1"), format: "lecture" },
    });
  });

  it("validates a Notice", () => {
    const notice = { level: "info", code: "fixture", message: "Fixture data." };
    expectSchema(Notice, notice, {
      "unknown code": { ...notice, code: "weird" },
      "long message": { ...notice, message: "x".repeat(161) },
    });
  });

  it("validates a Kit", () => {
    expectSchema(Kit, kit(), {
      "non-uuid id": { ...kit(), id: "kit-1" },
      "generation 0": { ...kit(), generation: 0 },
      "two sessions": { ...kit(), sessions: [session("s1"), session("s2")] },
      "bad source": { ...kit(), source: "llm" },
      "widened a domain Qloo cannot window": { ...kit(), widened: ["music"] },
    });
  });
});

describe("Reaction, SessionLogEntry, TraceEvent, CandidateBatch", () => {
  it("validates a Reaction", () => {
    const reaction = { cueEntityId: "e1", sessionId: "s1", value: "engaged", at: NOW };
    expectSchema(Reaction, reaction, {
      "liked is not a Reaction": { ...reaction, value: "liked" },
      "bad timestamp": { ...reaction, at: "yesterday" },
    });
  });

  it("validates a SessionLogEntry", () => {
    const entry = { id: UUID, kitId: UUID_2, sessionId: "s1", startedAt: NOW, reactions: [] };
    expectSchema(SessionLogEntry, entry, {
      "no kit id": { ...entry, kitId: undefined },
      "17 reactions": {
        ...entry,
        reactions: Array.from({ length: 17 }, () => ({
          cueEntityId: "e",
          sessionId: "s1",
          value: "neutral",
          at: NOW,
        })),
      },
    });
  });

  it("validates a TraceEvent", () => {
    const event = {
      id: "t1",
      atMs: 120,
      phase: "asking",
      actor: "server",
      status: "ok",
      label: "Asking Qloo for music",
      domain: "music",
      counts: { cues: 15, qlooCalls: 1, cacheHits: 0 },
    };
    expectSchema(TraceEvent, event, {
      "fractional ms": { ...event, atMs: 1.5 },
      "unknown actor": { ...event, actor: "model" },
    });
  });

  it("validates a CandidateBatch of at most 15 items", () => {
    const item = (n: number) => ({ entityId: `e${n}`, name: `N${n}`, imageUrl: null, domain: "music" });
    const batch = { domain: "music", source: "prefetch", items: [item(1)] };
    expectSchema(CandidateBatch, batch, {
      "16 items": { ...batch, items: Array.from({ length: 16 }, (_, n) => item(n)) },
      "unknown source": { ...batch, source: "agent" },
    });
  });
});

describe("request schemas are strict", () => {
  it("KitRequest applies defaults and rejects unknown keys", () => {
    const parsed = KitRequest.parse(kitRequest());
    expect(parsed.mode).toBe("live");
    expect(parsed.widen).toEqual([]);
    expect(parsed.previousCueIds).toEqual([]);

    expect(KitRequest.safeParse({ ...kitRequest(), firstName: "Margaret" }).success).toBe(false);
    expect(KitRequest.safeParse({ ...kitRequest(), generation: 0 }).success).toBe(false);
    expect(KitRequest.safeParse({ ...kitRequest(), mode: "stream" }).success).toBe(false);
    expect(KitRequest.safeParse({ ...kitRequest(), widen: ["music"] }).success).toBe(false);
  });

  it("KitRequest rejects a digest that smuggles in the first name", () => {
    const smuggled = { ...kitRequest(), digest: { ...digest(), firstName: "Margaret" } };
    expect(KitRequest.safeParse(smuggled).success).toBe(false);
  });

  it("BaselineRequest applies defaults and rejects unknown keys", () => {
    const body = { storyId: UUID, digest: digest() };
    expect(BaselineRequest.parse(body).mode).toBe("live");
    expect(BaselineRequest.safeParse({ ...body, extra: 1 }).success).toBe(false);
  });
});

describe("StoreV1 and ExportFile", () => {
  const store = () => ({
    schemaVersion: 1 as const,
    lifeStories: [lifeStory()],
    draft: null,
    profiles: { "demo-margaret": profile() },
    kits: { "demo-margaret": [kit()] },
    sessionLogs: {},
    activeStoryId: "demo-margaret",
  });

  it("validates the versioned store", () => {
    expectSchema(StoreV1, store(), {
      "future version": { ...store(), schemaVersion: 2 },
      "eleven stories": { ...store(), lifeStories: Array.from({ length: 11 }, lifeStory) },
      "seven kits": { ...store(), kits: { a: Array.from({ length: 7 }, kit) } },
      "bad active story": { ...store(), activeStoryId: "nope" },
    });
  });

  it("validates the export file", () => {
    const file = { app: "memory-lane", schemaVersion: 1, exportedAt: NOW, data: store() };
    expectSchema(ExportFile, file, {
      "other app": { ...file, app: "other" },
      "bad data": { ...file, data: { ...store(), schemaVersion: 9 } },
    });
  });
});
