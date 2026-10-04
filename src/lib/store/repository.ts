import { StoreV1 } from "@/contracts";
import type { Kit, LifeStory, LifeStoryDraft, SessionLogEntry, StoryId, TasteProfile } from "@/contracts";
import { deepFreeze } from "@/lib/deep-freeze";
import { logEvent } from "@/lib/log";
import { EMPTY_STORE, QUARANTINE_KEY, STORE_KEY, migrate, type Migration } from "./migrations";
import { memoryStorage, type KeyValueStorage, type StorageKind } from "./storage";

/** Kits kept per Life Story and log entries kept per Life Story (the StoreV1 caps; oldest go first). */
const MAX_KITS_PER_STORY = 6;
const MAX_LOGS_PER_STORY = 50;

/** What the UI can learn about the store beyond its data. */
export interface StoreStatus {
  /** `loading` until `load()` finishes; reads before then see an empty store. */
  readonly phase: "loading" | "ready";
  /** Data from a newer version of the app: viewable as empty, never written. */
  readonly readOnly: boolean;
  /** Stored data could not be read, so a copy was set aside and the store started empty. */
  readonly quarantined: boolean;
  /** `memory` means nothing will survive a reload. */
  readonly storage: StorageKind;
  /** The last save failed. The change is kept in memory for this session. */
  readonly saveFailed: boolean;
}

/** The Caregiver's data, on this device (PLAN section 3.5). Export, import and delete-all arrive in ticket 21. */
export interface Repository {
  getState(): StoreV1;
  getStatus(): StoreStatus;
  /** Reads, migrates and (if needed) quarantines. Safe to call more than once. */
  load(): Promise<void>;
  /** Calls `listener` after every change to state or status. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  saveDraft(draft: LifeStoryDraft | null): Promise<void>;
  saveLifeStory(story: LifeStory): Promise<void>;
  deleteLifeStory(id: StoryId): Promise<void>;
  saveKit(kit: Kit): Promise<void>;
  appendSessionLog(storyId: StoryId, entry: SessionLogEntry): Promise<void>;
  setProfile(storyId: StoryId, profile: TasteProfile): Promise<void>;
}

/** Thrown by every write when the stored data came from a newer version of the app. */
export class ReadOnlyStoreError extends Error {
  constructor() {
    super("The data on this device is from a newer version of Memory Lane, so it can only be read.");
    this.name = "ReadOnlyStoreError";
  }
}

export interface RepositoryOptions {
  /** Clock for quarantine timestamps. Defaults to the system clock. */
  readonly now?: () => string;
}

const withoutKey = <V>(record: Readonly<Record<string, V>>, key: string): Record<string, V> =>
  Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));

const newest = <T>(items: readonly T[], max: number): T[] => items.slice(Math.max(0, items.length - max));

/**
 * The local-first store: one versioned `StoreV1` object under one key.
 *
 * Every write builds a new state from the last one, validates the whole thing
 * with the shared schema, freezes it, then saves it. Writes run in call order.
 * If saving fails the change stays in memory for the session and the status
 * says so, instead of silently losing what the Caregiver just typed.
 */
export function createRepository(
  initialStorage: KeyValueStorage,
  migrations: readonly Migration[],
  { now = () => new Date().toISOString() }: RepositoryOptions = {},
): Repository {
  let storage = initialStorage;
  let state: StoreV1 = EMPTY_STORE;
  let status: StoreStatus = {
    phase: "loading",
    readOnly: false,
    quarantined: false,
    storage: initialStorage.kind,
    saveFailed: false,
  };
  let loading: Promise<void> | undefined;
  let writes: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((listener) => listener());
  const setStatus = (patch: Partial<StoreStatus>) => {
    status = { ...status, ...patch };
  };

  const persist = (snapshot: StoreV1): Promise<void> => {
    const run = writes.then(() => storage.set(STORE_KEY, snapshot));
    writes = run.catch(() => undefined);
    return run.then(
      () => {
        if (status.saveFailed) {
          setStatus({ saveFailed: false });
          notify();
        }
      },
      (error: unknown) => {
        logEvent({ event: "store_save_failed", level: "error", storage: storage.kind });
        setStatus({ saveFailed: true });
        notify();
        throw error;
      },
    );
  };

  async function readRaw(): Promise<unknown> {
    try {
      return await storage.get(STORE_KEY);
    } catch {
      logEvent({ event: "store_fallback_memory", level: "warn" });
      storage = memoryStorage();
      setStatus({ storage: "memory" });
      return undefined;
    }
  }

  async function quarantine(raw: unknown, reason: string): Promise<void> {
    logEvent({ event: "store_quarantined", level: "warn", reason });
    try {
      await storage.set(QUARANTINE_KEY, { at: now(), reason, raw });
    } catch {
      logEvent({ event: "store_quarantine_failed", level: "error" });
    }
    setStatus({ quarantined: true });
  }

  async function doLoad(): Promise<void> {
    const raw = await readRaw();
    const result = migrate(raw, migrations);
    switch (result.kind) {
      case "empty":
        break;
      case "ok":
        state = deepFreeze(result.state);
        if (result.migratedFrom !== undefined) {
          logEvent({ event: "store_migrated", from: result.migratedFrom });
          await persist(state).catch(() => undefined);
        }
        break;
      case "future":
        logEvent({ event: "store_read_only", level: "warn", version: result.version });
        setStatus({ readOnly: true });
        break;
      case "invalid":
        await quarantine(raw, result.reason);
        break;
    }
    setStatus({ phase: "ready" });
    notify();
  }

  const load = (): Promise<void> => (loading ??= doLoad());

  /** Applies `change` to the latest state, validates, commits and saves. */
  async function commit(change: (current: StoreV1) => unknown): Promise<void> {
    await load();
    if (status.readOnly) throw new ReadOnlyStoreError();
    const next = deepFreeze(StoreV1.parse(change(state)));
    state = next;
    notify();
    await persist(next);
  }

  return {
    getState: () => state,
    getStatus: () => status,
    load,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    saveDraft: (draft) => commit((s) => ({ ...s, draft })),
    saveLifeStory: (story) =>
      commit((s) => ({
        ...s,
        lifeStories: [...s.lifeStories.filter((existing) => existing.id !== story.id), story],
        activeStoryId: story.id,
      })),
    deleteLifeStory: (id) =>
      commit((s) => ({
        ...s,
        lifeStories: s.lifeStories.filter((story) => story.id !== id),
        profiles: withoutKey(s.profiles, id),
        kits: withoutKey(s.kits, id),
        sessionLogs: withoutKey(s.sessionLogs, id),
        activeStoryId: s.activeStoryId === id ? null : s.activeStoryId,
      })),
    saveKit: (kit) =>
      commit((s) => ({
        ...s,
        kits: { ...s.kits, [kit.storyId]: newest([...(s.kits[kit.storyId] ?? []), kit], MAX_KITS_PER_STORY) },
      })),
    appendSessionLog: (storyId, entry) =>
      commit((s) => ({
        ...s,
        sessionLogs: {
          ...s.sessionLogs,
          [storyId]: newest([...(s.sessionLogs[storyId] ?? []), entry], MAX_LOGS_PER_STORY),
        },
      })),
    setProfile: (storyId, profile) => commit((s) => ({ ...s, profiles: { ...s.profiles, [storyId]: profile } })),
  };
}
