import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import type { StoreV1 } from "@/contracts";
import { EMPTY_STORE, QUARANTINE_KEY, STORE_KEY, type Migration } from "./migrations";
import { createRepository, type Repository } from "./repository";
import { idbStorage, memoryStorage, type KeyValueStorage } from "./storage";
import { NOW, UUID_A, UUID_B, draft, kit, logEntry, profile, story } from "./testing";

/** Your data (FR-26, FR-27, SC-10, SC-12): export, import and delete-all through the repository. */

const MAX_IMPORT_BYTES = 512 * 1024;
const clock = () => NOW;

let dbCounter = 0;
const idb = () => idbStorage({ dbName: `roundtrip-test-${(dbCounter += 1)}` });

async function open(storage: KeyValueStorage = memoryStorage(), migrations: Migration[] = []) {
  const repo = createRepository(storage, migrations, { now: clock });
  await repo.load();
  return { repo, storage };
}

/** A store with something of everything in it, including an unfinished draft. */
async function fill(repo: Repository) {
  await repo.saveLifeStory(story(UUID_A));
  await repo.saveLifeStory(story(UUID_B));
  await repo.setProfile(UUID_A, profile());
  await repo.saveKit(kit(1, UUID_A));
  await repo.saveKit(kit(2, UUID_A));
  await repo.appendSessionLog(UUID_A, logEntry(1));
  await repo.saveDraft(draft(3, { firstName: "Doris" }));
}

const fileOf = (data: unknown, over: Record<string, unknown> = {}) =>
  JSON.stringify({ app: "memory-lane", schemaVersion: 1, exportedAt: NOW, data, ...over });

const emptyStore = (): StoreV1 => ({ ...EMPTY_STORE });

describe("exportAll", () => {
  it("returns a versioned ExportFile holding the whole store (FR-26)", async () => {
    const { repo } = await open();
    await fill(repo);

    const file = repo.exportAll();

    expect(file).toEqual({ app: "memory-lane", schemaVersion: 1, exportedAt: NOW, data: repo.getState() });
  });

  it("exports an empty store as a valid, empty file", async () => {
    const { repo } = await open();

    expect(repo.exportAll().data).toEqual(EMPTY_STORE);
  });
});

describe("export, delete all, import (SC-10)", () => {
  it("restores the data exactly, through real JSON text and a fresh reload", async () => {
    const storage = idb();
    const { repo } = await open(storage);
    await fill(repo);
    const before = structuredClone(repo.getState());
    const text = JSON.stringify(repo.exportAll());

    await repo.deleteAll();
    expect(repo.getState()).toEqual(EMPTY_STORE);
    const result = await repo.importAll(text);

    expect(result).toEqual({ ok: true, counts: { lifeStories: 2, kits: 2, sessionLogs: 1 } });
    expect(repo.getState()).toEqual(before);
    const reopened = await open(storage);
    expect(reopened.repo.getState()).toEqual(before);
  });

  it("replaces what is there rather than merging into it", async () => {
    const { repo } = await open();
    await repo.saveLifeStory(story(UUID_A));
    const text = JSON.stringify(repo.exportAll());
    await repo.saveLifeStory(story(UUID_B));
    await repo.saveDraft(draft(2));

    await repo.importAll(text);

    expect(repo.getState().lifeStories.map((s) => s.id)).toEqual([UUID_A]);
    expect(repo.getState().draft).toBeNull();
  });

  it("tells subscribers about the import and about the delete", async () => {
    const { repo } = await open();
    await repo.saveLifeStory(story(UUID_A));
    const text = JSON.stringify(repo.exportAll());
    const listener = vi.fn();
    repo.subscribe(listener);

    await repo.deleteAll();
    const afterDelete = listener.mock.calls.length;
    await repo.importAll(text);

    expect(afterDelete).toBeGreaterThan(0);
    expect(listener.mock.calls.length).toBeGreaterThan(afterDelete);
  });
});

describe("importAll rejects, and never partially applies (SC-12)", () => {
  async function openWithData() {
    const storage = idb();
    const { repo } = await open(storage);
    await repo.saveLifeStory(story(UUID_A));
    const stored = structuredClone(await storage.get(STORE_KEY));
    const state = repo.getState();
    return { repo, storage, stored, state };
  }

  it("rejects a file over 512 KB, counting bytes not characters", async () => {
    const { repo, stored, storage, state } = await openWithData();
    const bytes = MAX_IMPORT_BYTES + 1;
    // "é" is two bytes in UTF-8: under the cap as characters, over it as bytes.
    const padding = "é".repeat(Math.ceil(bytes / 2));
    const text = fileOf(emptyStore(), { padding });
    expect(text.length).toBeLessThan(MAX_IMPORT_BYTES + 1000);

    const result = await repo.importAll(text);

    expect(result).toMatchObject({ ok: false, reason: "too_large" });
    expect(result.ok === false && result.message).toMatch(/512 KB/);
    expect(repo.getState()).toBe(state);
    expect(await storage.get(STORE_KEY)).toEqual(stored);
  });

  it("accepts a file of exactly 512 KB and rejects one a byte more", async () => {
    const { repo } = await open();
    const base = fileOf(emptyStore());
    const baseBytes = new TextEncoder().encode(base).length;
    const exactly = base + " ".repeat(MAX_IMPORT_BYTES - baseBytes);

    expect(await repo.importAll(exactly)).toMatchObject({ ok: true });
    expect(await repo.importAll(exactly + " ")).toMatchObject({ ok: false, reason: "too_large" });
  });

  it.each([
    ["not JSON at all", "this is not json {", "not_json"],
    ["JSON that is not an object", "[1,2,3]", "not_memory_lane"],
    ["an empty file", "", "not_json"],
    ["a file from another app", JSON.stringify({ app: "other", schemaVersion: 1, exportedAt: NOW, data: EMPTY_STORE }), "not_memory_lane"],
    ["a file with no data", JSON.stringify({ app: "memory-lane", schemaVersion: 1, exportedAt: NOW }), "not_memory_lane"],
    ["a file with a bad date", fileOf(EMPTY_STORE, { exportedAt: "yesterday" }), "not_memory_lane"],
    ["a file with an extra top-level key", fileOf(EMPTY_STORE, { sneaky: true }), "not_memory_lane"],
    ["an envelope version that disagrees with the data", fileOf(EMPTY_STORE, { schemaVersion: 0 }), "invalid"],
    ["data that fails the schema", fileOf({ ...EMPTY_STORE, lifeStories: [{ id: "nope" }] }), "invalid"],
    ["one valid story and one broken Kit", fileOf({ ...EMPTY_STORE, lifeStories: [story(UUID_B)], kits: { [UUID_B]: [{ broken: true }] } }), "invalid"],
    ["data of the wrong type", fileOf("a string"), "not_memory_lane"],
  ])("rejects %s and leaves everything as it was", async (_label, text, reason) => {
    const { repo, storage, stored, state } = await openWithData();

    const result = await repo.importAll(text);

    expect(result).toMatchObject({ ok: false, reason });
    expect(repo.getState()).toBe(state);
    expect(await storage.get(STORE_KEY)).toEqual(stored);
  });

  it("rejects a file from a newer version of the app, in plain words", async () => {
    const { repo, state } = await openWithData();
    const text = JSON.stringify({ app: "memory-lane", schemaVersion: 2, exportedAt: NOW, data: { schemaVersion: 2 } });

    const result = await repo.importAll(text);

    expect(result).toMatchObject({ ok: false, reason: "future_version" });
    expect(result.ok === false && result.message).toMatch(/newer version/);
    expect(repo.getState()).toBe(state);
  });

  it("keeps messages free of anything from the file", async () => {
    const { repo } = await openWithData();
    const text = fileOf({ ...EMPTY_STORE, lifeStories: [{ firstName: "Secret Name" }] });

    const result = await repo.importAll(text);

    expect(JSON.stringify(result)).not.toContain("Secret Name");
  });

  it("reports a save failure as a failed import, with the old data intact", async () => {
    const { repo, state } = await openWithData();
    const text = JSON.stringify(repo.exportAll());
    const storage = memoryStorage();
    const failing: KeyValueStorage = { ...storage, set: () => Promise.reject(new Error("quota")) };
    const other = createRepository(failing, [], { now: clock });
    await other.load();

    const result = await other.importAll(text);

    expect(result).toMatchObject({ ok: false, reason: "save_failed" });
    expect(other.getState()).toEqual(EMPTY_STORE);
    expect(repo.getState()).toBe(state);
  });
});

describe("importAll migrates older files", () => {
  const v0ToV1: Migration = {
    from: 0,
    up: (raw) => {
      const { stories, ...rest } = raw as { schemaVersion: 0; stories: unknown[] };
      return { ...rest, schemaVersion: 1, lifeStories: stories, draft: null, profiles: {}, kits: {}, sessionLogs: {}, activeStoryId: null };
    },
  };

  it("runs the migrations and says which version the file came from", async () => {
    const { repo } = await open(memoryStorage(), [v0ToV1]);
    const text = JSON.stringify({ app: "memory-lane", schemaVersion: 0, exportedAt: NOW, data: { schemaVersion: 0, stories: [story(UUID_A)] } });

    const result = await repo.importAll(text);

    expect(result).toEqual({ ok: true, migratedFrom: 0, counts: { lifeStories: 1, kits: 0, sessionLogs: 0 } });
    expect(repo.getState()).toMatchObject({ schemaVersion: 1, lifeStories: [{ id: UUID_A }] });
  });

  it("rejects an old file when there is no way to upgrade it", async () => {
    const { repo } = await open();
    const text = JSON.stringify({ app: "memory-lane", schemaVersion: 0, exportedAt: NOW, data: { schemaVersion: 0 } });

    expect(await repo.importAll(text)).toMatchObject({ ok: false, reason: "invalid" });
  });
});

describe("previewImport (the confirmation step)", () => {
  it("counts what the file holds without changing anything", async () => {
    const { repo: source } = await open();
    await fill(source);
    const text = JSON.stringify(source.exportAll());
    const { repo } = await open();
    const listener = vi.fn();
    repo.subscribe(listener);

    const preview = repo.previewImport(text);

    expect(preview).toEqual({ ok: true, counts: { lifeStories: 2, kits: 2, sessionLogs: 1 } });
    expect(repo.getState()).toEqual(EMPTY_STORE);
    expect(listener).not.toHaveBeenCalled();
  });

  it("gives the same rejection importAll would", async () => {
    const { repo } = await open();

    expect(repo.previewImport("nope")).toMatchObject({ ok: false, reason: "not_json" });
  });
});

describe("a read-only store (data from a newer version)", () => {
  async function openFuture() {
    const storage = memoryStorage();
    const future = { schemaVersion: 2, lifeStories: ["something new"] };
    await storage.set(STORE_KEY, future);
    const { repo } = await open(storage);
    return { repo, storage, future };
  }

  it("refuses an import rather than overwrite what it cannot read", async () => {
    const { repo, storage, future } = await openFuture();
    const text = fileOf(emptyStore());

    expect(repo.previewImport(text)).toMatchObject({ ok: false, reason: "read_only" });
    expect(await repo.importAll(text)).toMatchObject({ ok: false, reason: "read_only" });
    expect(await storage.get(STORE_KEY)).toEqual(future);
  });

  it("offers the unreadable data as a file, so Export in the banner saves something real", async () => {
    const { repo, future } = await openFuture();

    const held = repo.exportUnreadable();

    expect(held).not.toBeNull();
    expect(JSON.parse(held ?? "")).toEqual({ app: "memory-lane", schemaVersion: 2, exportedAt: NOW, data: future });
  });

  it("lets Delete all clear it, which makes the store writable again", async () => {
    const { repo, storage } = await openFuture();

    await repo.deleteAll();

    expect(repo.getStatus()).toMatchObject({ readOnly: false, quarantined: false });
    expect(await storage.get(STORE_KEY)).toBeUndefined();
    await repo.saveDraft(draft(1));
    expect(repo.getState().draft).not.toBeNull();
  });
});

describe("a quarantined store", () => {
  it("offers the set-aside copy as a file and clears it on Delete all", async () => {
    const storage = memoryStorage();
    await storage.set(STORE_KEY, "garbage");
    const { repo } = await open(storage);

    expect(JSON.parse(repo.exportUnreadable() ?? "")).toMatchObject({ app: "memory-lane", data: "garbage" });
    await repo.deleteAll();

    expect(repo.getStatus().quarantined).toBe(false);
    expect(await storage.get(QUARANTINE_KEY)).toBeUndefined();
    expect(repo.exportUnreadable()).toBeNull();
  });

  it("has nothing unreadable to offer when the store is healthy", async () => {
    const { repo } = await open();

    expect(repo.exportUnreadable()).toBeNull();
  });
});

describe("deleteAll (FR-27)", () => {
  it("clears every record and any unfinished draft from IndexedDB", async () => {
    const storage = idb();
    const { repo } = await open(storage);
    await fill(repo);

    await repo.deleteAll();

    expect(repo.getState()).toEqual(EMPTY_STORE);
    expect(await storage.get(STORE_KEY)).toBeUndefined();
    expect(await storage.get(QUARANTINE_KEY)).toBeUndefined();
    expect((await open(storage)).repo.getState()).toEqual(EMPTY_STORE);
  });

  it("runs after saves that are still in flight, so nothing reappears", async () => {
    const storage = idb();
    const { repo } = await open(storage);

    const pending = repo.saveDraft(draft(2));
    await repo.deleteAll();
    await pending;

    expect(await storage.get(STORE_KEY)).toBeUndefined();
  });

  it("fails loudly, and keeps the data in view, when the browser will not delete", async () => {
    const base = memoryStorage();
    const stuck: KeyValueStorage = { ...base, del: () => Promise.reject(new Error("blocked")) };
    const { repo } = await open(stuck);
    await repo.saveLifeStory(story(UUID_A));

    await expect(repo.deleteAll()).rejects.toThrow();

    expect(repo.getState().lifeStories).toHaveLength(1);
  });

  it("clears the save-failed flag along with the data", async () => {
    let failing = true;
    const base = memoryStorage();
    const flaky: KeyValueStorage = {
      ...base,
      set: (key, value) => (failing ? Promise.reject(new Error("quota")) : base.set(key, value)),
    };
    const { repo } = await open(flaky);
    await repo.saveDraft(draft(1)).catch(() => undefined);
    expect(repo.getStatus().saveFailed).toBe(true);
    failing = false;

    await repo.deleteAll();

    expect(repo.getStatus().saveFailed).toBe(false);
  });
});
