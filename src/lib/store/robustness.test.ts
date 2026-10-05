import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EMPTY_STORE, QUARANTINE_KEY, STORE_KEY } from "./migrations";
import { ReadOnlyStoreError, createRepository, type Repository } from "./repository";
import { idbStorage, memoryStorage, storageFrom, type KeyValueStorage } from "./storage";
import { NOW, UUID_A, UUID_B, draft, kit, profile, story } from "./testing";

/** Review fixes H1, H2, M6 and L3: the store stays correct with two tabs, bad disks and slow browsers. */

const clock = () => NOW;
const opened: Repository[] = [];

let channelCounter = 0;
const freshChannel = () => `store-test-${(channelCounter += 1)}`;
let dbCounter = 0;
const freshDb = () => `robust-test-${(dbCounter += 1)}`;

async function open(storage: KeyValueStorage, channelName?: string) {
  const repo = createRepository(storage, [], { now: clock, ...(channelName === undefined ? {} : { channelName }) });
  opened.push(repo);
  await repo.load();
  return repo;
}

afterEach(() => {
  vi.useRealTimers();
  opened.splice(0).forEach((repo) => repo.close());
});

describe("H1: two tabs on one store", () => {
  it.each([
    ["memory", () => memoryStorage()],
    ["IndexedDB", () => idbStorage({ dbName: freshDb() })],
  ])("keeps both writes when each tab loaded before the other wrote (%s)", async (_label, make) => {
    const storage = make();
    const tabA = await open(storage);
    const tabB = await open(storage);

    await tabA.saveLifeStory(story(UUID_A));
    await tabB.saveLifeStory(story(UUID_B));

    expect(tabB.getState().lifeStories.map((s) => s.id).sort()).toEqual([UUID_A, UUID_B].sort());
    expect(((await storage.get(STORE_KEY)) as { lifeStories: unknown[] }).lifeStories).toHaveLength(2);
  });

  it("does not let a stale tab overwrite a Kit another tab saved", async () => {
    const storage = memoryStorage();
    const tabA = await open(storage);
    const tabB = await open(storage);
    await tabA.saveLifeStory(story(UUID_A));
    await tabA.saveKit(kit(1, UUID_A));

    await tabB.saveDraft(draft(2));

    const stored = (await storage.get(STORE_KEY)) as { kits: Record<string, unknown[]>; lifeStories: unknown[] };
    expect(stored.lifeStories).toHaveLength(1);
    expect(stored.kits[UUID_A]).toHaveLength(1);
  });

  it("refreshes the other tab through the broadcast channel", async () => {
    const storage = idbStorage({ dbName: freshDb() });
    const name = freshChannel();
    const tabA = await open(storage, name);
    const tabB = await open(storage, name);
    const heard = vi.fn();
    tabB.subscribe(heard);

    await tabA.saveLifeStory(story(UUID_A));

    await vi.waitFor(() => expect(tabB.getState().lifeStories).toHaveLength(1));
    expect(heard).toHaveBeenCalled();
  });

  it("clears the other tab when one tab deletes everything", async () => {
    const storage = idbStorage({ dbName: freshDb() });
    const name = freshChannel();
    const tabA = await open(storage, name);
    const tabB = await open(storage, name);
    await tabA.saveLifeStory(story(UUID_A));
    await vi.waitFor(() => expect(tabB.getState().lifeStories).toHaveLength(1));

    await tabA.deleteAll();

    await vi.waitFor(() => expect(tabB.getState()).toEqual(EMPTY_STORE));
  });

  it("stops writing, and says why, when the stored data turns out to be from a newer version", async () => {
    const storage = memoryStorage();
    const tab = await open(storage);
    await tab.saveLifeStory(story(UUID_A));
    const future = { schemaVersion: 2, lifeStories: ["from the future"] };
    await storage.set(STORE_KEY, future);

    await expect(tab.saveDraft(draft(1))).rejects.toBeInstanceOf(ReadOnlyStoreError);

    expect(await storage.get(STORE_KEY)).toEqual(future);
    expect(tab.getStatus().readOnly).toBe(true);
  });

  it("keeps an unsaved change when saving works again, because memory was ahead of the disk", async () => {
    let failing = false;
    const inner = memoryStorage();
    const flaky = storageFrom({
      ...inner,
      set: (k, v) => (failing ? Promise.reject(new Error("quota")) : inner.set(k, v)),
    });
    const repo = await open(flaky);
    await repo.saveLifeStory(story(UUID_A));
    failing = true;
    await repo.saveLifeStory(story(UUID_B)).catch(() => undefined);
    failing = false;

    await repo.saveDraft(draft(2));

    const stored = (await inner.get(STORE_KEY)) as { lifeStories: unknown[] };
    expect(stored.lifeStories).toHaveLength(2);
    expect(repo.getStatus().saveFailed).toBe(false);
  });
});

describe("H2: data that could not be set aside is never written over", () => {
  const rejectQuarantine = (inner: KeyValueStorage): KeyValueStorage =>
    storageFrom({
      ...inner,
      set: (k, v) => (k === QUARANTINE_KEY ? Promise.reject(new Error("quota")) : inner.set(k, v)),
    });

  async function openUnsafe() {
    const inner = memoryStorage();
    await inner.set(STORE_KEY, "garbage");
    const repo = await open(rejectQuarantine(inner));
    return { repo, inner };
  }

  it("opens read-only with its own flag instead of claiming a copy was set aside", async () => {
    const { repo } = await openUnsafe();

    expect(repo.getStatus()).toMatchObject({ readOnly: true, quarantined: false, setAsideFailed: true });
  });

  it("refuses writes, so the only copy stays where it is", async () => {
    const { repo, inner } = await openUnsafe();

    await expect(repo.saveDraft(draft(1))).rejects.toBeInstanceOf(ReadOnlyStoreError);

    expect(await inner.get(STORE_KEY)).toBe("garbage");
  });

  it("still offers the data as a file, and Delete all gets out of it", async () => {
    const { repo, inner } = await openUnsafe();

    expect(JSON.parse(repo.exportUnreadable() ?? "")).toMatchObject({ data: "garbage" });
    await repo.deleteAll();

    expect(repo.getStatus()).toMatchObject({ readOnly: false, quarantined: false, setAsideFailed: false });
    expect(await inner.get(STORE_KEY)).toBeUndefined();
  });

  it("does not set the flag when the copy was set aside safely", async () => {
    const inner = memoryStorage();
    await inner.set(STORE_KEY, "garbage");

    const repo = await open(inner);

    expect(repo.getStatus()).toMatchObject({ readOnly: false, quarantined: true, setAsideFailed: false });
  });
});

describe("M6: a browser that never answers", () => {
  const hung = (): KeyValueStorage => ({
    kind: "indexeddb",
    get: () => new Promise(() => undefined),
    set: () => new Promise(() => undefined),
    del: () => new Promise(() => undefined),
    update: () => new Promise(() => undefined),
  });

  it("gives up after 3 seconds and carries on in memory", async () => {
    vi.useFakeTimers();
    const repo = createRepository(hung(), [], { now: clock });
    opened.push(repo);

    const loading = repo.load();
    await vi.advanceTimersByTimeAsync(2999);
    expect(repo.getStatus().phase).toBe("loading");
    await vi.advanceTimersByTimeAsync(1);
    await loading;

    expect(repo.getStatus()).toMatchObject({ phase: "ready", storage: "memory" });
    await repo.saveDraft(draft(1));
    expect(repo.getState().draft?.step).toBe(1);
  });

  it("ignores an answer that arrives after it gave up", async () => {
    vi.useFakeTimers();
    let answer: (value: unknown) => void = () => undefined;
    const slow: KeyValueStorage = {
      ...hung(),
      get: () => new Promise((resolve) => (answer = resolve)),
    };
    const repo = createRepository(slow, [], { now: clock });
    opened.push(repo);
    const loading = repo.load();
    await vi.advanceTimersByTimeAsync(3000);
    await loading;

    answer({ ...EMPTY_STORE, lifeStories: [story(UUID_A)] });
    await vi.advanceTimersByTimeAsync(10);

    expect(repo.getState().lifeStories).toHaveLength(0);
  });

  it("does not wait when the browser answers quickly, and leaves no timer behind", async () => {
    vi.useFakeTimers();
    const repo = createRepository(memoryStorage(), [], { now: clock });
    opened.push(repo);

    await repo.load();

    expect(repo.getStatus()).toMatchObject({ phase: "ready", storage: "memory" });
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("L3: unrelated writes keep object identity", () => {
  it("leaves untouched slices as the same objects", async () => {
    const repo = await open(memoryStorage());
    await repo.saveLifeStory(story(UUID_A));
    await repo.setProfile(UUID_A, profile());
    await repo.saveKit(kit(1, UUID_A));
    const before = repo.getState();

    await repo.saveDraft(draft(2));
    const after = repo.getState();

    expect(after).not.toBe(before);
    expect(after.lifeStories).toBe(before.lifeStories);
    expect(after.profiles).toBe(before.profiles);
    expect(after.kits).toBe(before.kits);
    expect(after.draft).not.toBe(before.draft);
  });

  it("keeps an unchanged Life Story the same object when another is added", async () => {
    const repo = await open(memoryStorage());
    await repo.saveLifeStory(story(UUID_A));
    const first = repo.getState().lifeStories[0];

    await repo.saveLifeStory(story(UUID_B));

    expect(repo.getState().lifeStories[0]).toBe(first);
    expect(repo.getState().lifeStories).toHaveLength(2);
  });

  it("still freezes what it returns", async () => {
    const repo = await open(memoryStorage());
    await repo.saveLifeStory(story(UUID_A));

    expect(Object.isFrozen(repo.getState().lifeStories[0])).toBe(true);
  });
});
