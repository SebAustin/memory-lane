import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import type { Kit, LifeStory, LifeStoryDraft, SessionLogEntry, TasteProfile } from "@/contracts";
import { EMPTY_STORE, QUARANTINE_KEY, STORE_KEY, type Migration } from "./migrations";
import { ReadOnlyStoreError, createRepository } from "./repository";
import { idbStorage, memoryStorage, type KeyValueStorage } from "./storage";

const NOW = "2026-10-03T12:00:00.000Z";
const UUID_A = "3f1c2a9e-5b7d-4c1e-9a52-0d8f6e4b7a11";
const UUID_B = "9b2d4c6e-1a3f-4e5d-8b7c-6a5f4e3d2c1b";

let dbCounter = 0;
const idb = () => idbStorage({ dbName: `repo-test-${(dbCounter += 1)}` });
const clock = () => NOW;

const story = (id: string = UUID_A): LifeStory => ({
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

const draft = (step: number, values: LifeStoryDraft["values"] = {}): LifeStoryDraft => ({
  step,
  values,
  updatedAt: NOW,
});

const profile = (): TasteProfile => ({
  version: 0,
  seeds: [
    { entityId: "s1", name: "Seed 1" },
    { entityId: "s2", name: "Seed 2" },
  ],
  learnedFavorites: [],
  exclusions: [],
  avoidTopics: [],
});

const kit = (n: number, storyId: string = UUID_A): Kit => {
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
const storyIdOf = (id: string) => id as Kit["storyId"];

const logEntry = (n: number): SessionLogEntry => ({
  id: UUID_B,
  kitId: UUID_A,
  sessionId: `s${n}`,
  startedAt: NOW,
  reactions: [],
});

async function open(storage: KeyValueStorage = memoryStorage(), migrations: Migration[] = []) {
  const repo = createRepository(storage, migrations, { now: clock });
  await repo.load();
  return { repo, storage };
}

describe("loading", () => {
  it("starts from an empty store when nothing was saved", async () => {
    const { repo } = await open(idb());

    expect(repo.getState()).toEqual(EMPTY_STORE);
    expect(repo.getStatus()).toMatchObject({ phase: "ready", readOnly: false, quarantined: false, storage: "indexeddb" });
  });

  it("reports loading until load() has run, and load() is safe to call twice", async () => {
    const repo = createRepository(memoryStorage(), [], { now: clock });

    expect(repo.getStatus().phase).toBe("loading");
    await Promise.all([repo.load(), repo.load()]);

    expect(repo.getStatus().phase).toBe("ready");
  });

  it("runs migrations on load and saves the migrated store under the current version", async () => {
    const storage = memoryStorage();
    await storage.set(STORE_KEY, { schemaVersion: 0, stories: [story()] });
    const v0ToV1: Migration = {
      from: 0,
      up: (raw) => {
        const { stories, ...rest } = raw as { schemaVersion: 0; stories: unknown[] };
        return { ...rest, schemaVersion: 1, lifeStories: stories, draft: null, profiles: {}, kits: {}, sessionLogs: {}, activeStoryId: null };
      },
    };

    const { repo } = await open(storage, [v0ToV1]);

    expect(repo.getState().lifeStories).toHaveLength(1);
    expect(await storage.get(STORE_KEY)).toMatchObject({ schemaVersion: 1 });
  });
});

describe("quarantine (invalid data)", () => {
  it.each([
    ["not an object", "garbage"],
    ["a broken schema", { ...EMPTY_STORE, lifeStories: [{ nope: true }] }],
    ["an old version with no migration", { schemaVersion: 0 }],
  ])("sets aside %s and starts empty", async (_label, raw) => {
    const storage = memoryStorage();
    await storage.set(STORE_KEY, raw);

    const { repo } = await open(storage);

    expect(repo.getState()).toEqual(EMPTY_STORE);
    expect(repo.getStatus().quarantined).toBe(true);
    expect(await storage.get(QUARANTINE_KEY)).toMatchObject({ raw, at: NOW });
  });

  it("stays writable after quarantine, and the next save replaces the bad data", async () => {
    const storage = memoryStorage();
    await storage.set(STORE_KEY, "garbage");
    const { repo } = await open(storage);

    await repo.saveDraft(draft(2));

    expect(await storage.get(STORE_KEY)).toMatchObject({ draft: { step: 2 } });
    expect(await storage.get(QUARANTINE_KEY)).toMatchObject({ raw: "garbage" });
  });
});

describe("future versions (read-only)", () => {
  async function openFuture() {
    const storage = memoryStorage();
    const future = { schemaVersion: 2, lifeStories: ["something new"] };
    await storage.set(STORE_KEY, future);
    const { repo } = await open(storage);
    return { repo, storage, future };
  }

  it("opens read-only with an empty view", async () => {
    const { repo } = await openFuture();

    expect(repo.getStatus()).toMatchObject({ readOnly: true, quarantined: false });
    expect(repo.getState()).toEqual(EMPTY_STORE);
  });

  it("refuses every write and leaves the stored data untouched", async () => {
    const { repo, storage, future } = await openFuture();

    await expect(repo.saveDraft(draft(1))).rejects.toBeInstanceOf(ReadOnlyStoreError);
    await expect(repo.saveLifeStory(story())).rejects.toBeInstanceOf(ReadOnlyStoreError);

    expect(await storage.get(STORE_KEY)).toEqual(future);
    expect(await storage.get(QUARANTINE_KEY)).toBeUndefined();
  });
});

describe("drafts", () => {
  it("saves a draft and resumes it from a fresh repository over the same storage", async () => {
    const storage = idb();
    const first = await open(storage);
    await first.repo.saveDraft(draft(3, { firstName: "Margaret", birthYear: 1946, hometown: "Memphis" }));

    const second = await open(storage);

    expect(second.repo.getState().draft).toMatchObject({
      step: 3,
      values: { firstName: "Margaret", birthYear: 1946, hometown: "Memphis" },
    });
  });

  it("clears the draft with null", async () => {
    const { repo } = await open();
    await repo.saveDraft(draft(2));

    await repo.saveDraft(null);

    expect(repo.getState().draft).toBeNull();
  });

  it("rejects an invalid draft and keeps the state as it was", async () => {
    const { repo } = await open();
    await repo.saveDraft(draft(2));
    const before = repo.getState();

    await expect(repo.saveDraft({ ...draft(2), step: 9 })).rejects.toThrow();

    expect(repo.getState()).toBe(before);
  });
});

describe("immutability", () => {
  it("makes every write a new object and leaves earlier state untouched", async () => {
    const { repo } = await open();
    const before = repo.getState();

    await repo.saveDraft(draft(2, { firstName: "Margaret" }));
    const after = repo.getState();

    expect(after).not.toBe(before);
    expect(before.draft).toBeNull();
    expect(after.draft?.values.firstName).toBe("Margaret");
  });

  it("freezes state so a caller cannot change it by accident", async () => {
    const { repo } = await open();
    await repo.saveDraft(draft(2));

    expect(Object.isFrozen(repo.getState())).toBe(true);
    expect(Object.isFrozen(repo.getState().draft)).toBe(true);
  });

  it("does not let the caller's input object leak into the store", async () => {
    const { repo } = await open();
    const input = draft(2, { firstName: "Margaret" });

    await repo.saveDraft(input);

    expect(repo.getState().draft).not.toBe(input);
    expect(Object.isFrozen(input)).toBe(false);
  });
});

describe("Life Stories, profiles, Kits and logs", () => {
  it("saves a Life Story, makes it active, and replaces it by id", async () => {
    const { repo } = await open();

    await repo.saveLifeStory(story());
    await repo.saveLifeStory({ ...story(), hometown: "Nashville" });

    expect(repo.getState().lifeStories).toHaveLength(1);
    expect(repo.getState().lifeStories[0]?.hometown).toBe("Nashville");
    expect(repo.getState().activeStoryId).toBe(UUID_A);
  });

  it("deletes a Life Story together with its profile, Kits and logs", async () => {
    const { repo } = await open();
    await repo.saveLifeStory(story());
    await repo.setProfile(UUID_A as LifeStory["id"], profile());
    await repo.saveKit(kit(1));
    await repo.appendSessionLog(UUID_A as LifeStory["id"], logEntry(1));

    await repo.deleteLifeStory(UUID_A as LifeStory["id"]);

    expect(repo.getState()).toEqual(EMPTY_STORE);
  });

  it("keeps the newest 6 Kits per story and the newest 50 log entries", async () => {
    const { repo } = await open();
    for (let n = 1; n <= 8; n += 1) await repo.saveKit(kit(n));
    for (let n = 1; n <= 52; n += 1) await repo.appendSessionLog(UUID_A as LifeStory["id"], logEntry(n));

    const kits = repo.getState().kits[UUID_A] ?? [];
    const logs = repo.getState().sessionLogs[UUID_A] ?? [];

    expect(kits.map((k) => k.generation)).toEqual([3, 4, 5, 6, 7, 8]);
    expect(logs).toHaveLength(50);
    expect(logs[0]?.sessionId).toBe("s3");
    expect(logs[49]?.sessionId).toBe("s52");
  });

  it("limits the store to 10 Life Stories with a clear error", async () => {
    const { repo } = await open();
    for (let n = 0; n < 10; n += 1) {
      await repo.saveLifeStory(story(`3f1c2a9e-5b7d-4c1e-9a52-0d8f6e4b7a${String(n).padStart(2, "0")}`));
    }

    await expect(repo.saveLifeStory(story())).rejects.toThrow();
    expect(repo.getState().lifeStories).toHaveLength(10);
  });
});

describe("subscriptions and write order", () => {
  it("notifies subscribers once per write, and not after unsubscribe", async () => {
    const { repo } = await open();
    const listener = vi.fn();
    const unsubscribe = repo.subscribe(listener);

    await repo.saveDraft(draft(2));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await repo.saveDraft(draft(3));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("applies overlapping writes in the order they were called", async () => {
    const storage = idb();
    const { repo } = await open(storage);

    await Promise.all([1, 2, 3, 4, 5].map((step) => repo.saveDraft(draft(step))));

    expect(repo.getState().draft?.step).toBe(5);
    expect(await storage.get(STORE_KEY)).toMatchObject({ draft: { step: 5 } });
  });

  it("waits for load before the first write", async () => {
    const storage = memoryStorage();
    await storage.set(STORE_KEY, { ...EMPTY_STORE, draft: draft(4) });
    const repo = createRepository(storage, [], { now: clock });

    await repo.saveLifeStory(story());

    expect(repo.getState().draft?.step).toBe(4);
    expect(repo.getState().lifeStories).toHaveLength(1);
  });
});

describe("when the storage misbehaves", () => {
  const brokenReads: KeyValueStorage = {
    kind: "indexeddb",
    get: () => Promise.reject(new Error("IndexedDB is blocked")),
    set: () => Promise.reject(new Error("IndexedDB is blocked")),
    del: () => Promise.reject(new Error("IndexedDB is blocked")),
  };

  it("falls back to memory when IndexedDB cannot be read, and keeps working", async () => {
    const { repo } = await open(brokenReads);

    expect(repo.getStatus()).toMatchObject({ phase: "ready", storage: "memory" });
    await repo.saveDraft(draft(2));
    expect(repo.getState().draft?.step).toBe(2);
    expect(repo.getStatus().saveFailed).toBe(false);
  });

  it("keeps the in-memory change, flags the failure and rejects when a save fails", async () => {
    const failing: KeyValueStorage = { ...memoryStorage(), set: () => Promise.reject(new Error("quota")) };
    const { repo } = await open(failing);

    await expect(repo.saveDraft(draft(2))).rejects.toThrow("quota");

    expect(repo.getState().draft?.step).toBe(2);
    expect(repo.getStatus().saveFailed).toBe(true);
  });

  it("recovers: the next successful save clears the failure flag", async () => {
    const inner = memoryStorage();
    let failNext = true;
    const flaky: KeyValueStorage = {
      ...inner,
      set: (k, v) => (failNext ? Promise.reject(new Error("quota")) : inner.set(k, v)),
    };
    const { repo } = await open(flaky);
    await repo.saveDraft(draft(2)).catch(() => undefined);

    failNext = false;
    await repo.saveDraft(draft(3));

    expect(repo.getStatus().saveFailed).toBe(false);
  });

  it("keeps working after a failed save (the queue does not jam)", async () => {
    const inner = memoryStorage();
    let calls = 0;
    const flaky: KeyValueStorage = {
      ...inner,
      set: (k, v) => ((calls += 1) === 1 ? Promise.reject(new Error("once")) : inner.set(k, v)),
    };
    const { repo } = await open(flaky);

    await repo.saveDraft(draft(2)).catch(() => undefined);
    await repo.saveDraft(draft(3));

    expect(await inner.get(STORE_KEY)).toMatchObject({ draft: { step: 3 } });
  });
});
