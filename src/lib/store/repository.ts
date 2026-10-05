import { StoreV1 } from "@/contracts";
import type { ExportFile, Kit, LifeStory, LifeStoryDraft, SessionLogEntry, StoryId, TasteProfile } from "@/contracts";
import { deepFreeze } from "@/lib/deep-freeze";
import { logEvent } from "@/lib/log";
import { buildExportFile, importFailure, readImportFile, type ImportResult, type ParsedImport } from "./importFile";
import { EMPTY_STORE, OWNED_KEYS, QUARANTINE_KEY, STORE_KEY, migrate, type Migration } from "./migrations";
import { shareStructure } from "./share";
import { memoryStorage, type KeyValueStorage, type StorageKind } from "./storage";

/** Kits kept per Life Story and log entries kept per Life Story (the StoreV1 caps; oldest go first). */
const MAX_KITS_PER_STORY = 6;
const MAX_LOGS_PER_STORY = 50;

/** How long to wait for the browser's storage to answer before carrying on in memory. */
const LOAD_TIMEOUT_MS = 3000;
/** The BroadcastChannel that tells other tabs to re-read the store. */
export const STORE_CHANNEL = "memory-lane-store";

/** What the UI can learn about the store beyond its data. */
export interface StoreStatus {
  /** `loading` until `load()` finishes; reads before then see an empty store. */
  readonly phase: "loading" | "ready";
  /** Data this build cannot use (a newer version, or unreadable and not safely set aside): viewable as empty, never written. */
  readonly readOnly: boolean;
  /** Stored data could not be read, so a copy was set aside and the store started empty. */
  readonly quarantined: boolean;
  /** Stored data could not be read and a copy could not be set aside either, so the store is read-only to keep the only copy. */
  readonly setAsideFailed: boolean;
  /** `memory` means nothing will survive a reload. */
  readonly storage: StorageKind;
  /** The last save failed. The change is kept in memory for this session. */
  readonly saveFailed: boolean;
}

/** The Caregiver's data, on this device (PLAN section 3.5). */
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
  /** Everything on this device as one versioned file (FR-26). Build the download from it; nothing leaves the browser. */
  exportAll(): ExportFile;
  /**
   * The data this build could not use (from a newer version, or set aside as
   * unreadable) as JSON text, so the banner's Export saves something real.
   * `null` when there is none.
   */
  exportUnreadable(): string | null;
  /** Checks a file and counts what it holds, without changing anything. This is the confirmation step. */
  previewImport(text: string): ImportResult;
  /**
   * Replaces everything on this device with the contents of an export file.
   * The file is validated and migrated in full first, then saved in one write,
   * so a bad file never changes anything (SC-12).
   */
  importAll(text: string): Promise<ImportResult>;
  /** Removes every Life Story, Session Log, draft and set-aside copy from this device (FR-27). Rejects if the browser will not delete. */
  deleteAll(): Promise<void>;
  /** Stops listening to other tabs. Call when the repository is discarded. */
  close(): void;
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
  /** BroadcastChannel name for telling other tabs about changes. No channel when omitted. */
  readonly channelName?: string;
  /** Milliseconds to wait for the first read before falling back to memory. */
  readonly loadTimeoutMs?: number;
}

/** The stored data is not something this build may write over. Carries it so it can still be exported. */
class UnreadableStoredError extends Error {
  constructor(readonly stored: unknown) {
    super("The stored data cannot be read by this version.");
    this.name = "UnreadableStoredError";
  }
}

/** What the caller sees of a parsed file: the counts, never the data. */
function resultOf(parsed: ParsedImport): ImportResult {
  if (!parsed.ok) return parsed;
  return parsed.migratedFrom === undefined
    ? { ok: true, counts: parsed.counts }
    : { ok: true, counts: parsed.counts, migratedFrom: parsed.migratedFrom };
}

const withoutKey = <V>(record: Readonly<Record<string, V>>, key: string): Record<string, V> =>
  Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));

const newest = <T>(items: readonly T[], max: number): T[] => items.slice(Math.max(0, items.length - max));

/**
 * The local-first store: one versioned `StoreV1` object under one key.
 *
 * Every write is one read-modify-write on what is stored right now (not on
 * this tab's memory, so a second tab's writes are never undone). The result is
 * validated with the shared schema, frozen, and keeps the identity of every
 * part that did not change. Writes run in call order. If saving fails the
 * change stays in memory for the session and the status says so, instead of
 * silently losing what the Caregiver just typed.
 */
export function createRepository(
  initialStorage: KeyValueStorage,
  migrations: readonly Migration[],
  { now = () => new Date().toISOString(), channelName, loadTimeoutMs = LOAD_TIMEOUT_MS }: RepositoryOptions = {},
): Repository {
  let storage = initialStorage;
  let state: StoreV1 = EMPTY_STORE;
  let status: StoreStatus = {
    phase: "loading",
    readOnly: false,
    quarantined: false,
    setAsideFailed: false,
    storage: initialStorage.kind,
    saveFailed: false,
  };
  let loading: Promise<void> | undefined;
  /** Stored data this build cannot use, kept so the banner can still offer it as a file. */
  let unreadable: unknown;
  let writes: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((listener) => listener());
  const setStatus = (patch: Partial<StoreStatus>) => {
    status = { ...status, ...patch };
  };

  /** Runs `task` after every write already queued, and makes later writes wait for it. */
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const run = writes.then(task);
    writes = run.catch(() => undefined);
    return run;
  };

  const channel =
    channelName !== undefined && typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(channelName) : null;
  /** Tells other tabs to re-read. Pointless when nothing is shared (memory). */
  const announce = () => {
    if (status.storage === "indexeddb") channel?.postMessage("changed");
  };

  /** Re-reads the store after another tab wrote, keeping this tab's unsaved work if it has any. */
  const refresh = () =>
    enqueue(async () => {
      if (status.phase !== "ready" || status.readOnly || status.saveFailed) return;
      const result = migrate(await storage.get(STORE_KEY), migrations);
      if (result.kind !== "empty" && result.kind !== "ok") return;
      const next = shareStructure(state, result.state);
      if (next === state) return;
      state = deepFreeze(next);
      notify();
    }).catch(() => undefined);
  if (channel !== null) channel.onmessage = () => void refresh();

  async function readRaw(): Promise<unknown> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("storage did not answer")), loadTimeoutMs);
    });
    try {
      return await Promise.race([storage.get(STORE_KEY), timeout]);
    } catch {
      logEvent({ event: "store_fallback_memory", level: "warn" });
      storage = memoryStorage();
      setStatus({ storage: "memory" });
      return undefined;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Sets the unreadable data aside. If that fails the store goes read-only, so the only copy is never written over. */
  async function quarantine(raw: unknown, reason: string): Promise<void> {
    logEvent({ event: "store_quarantined", level: "warn", reason });
    try {
      await storage.set(QUARANTINE_KEY, { at: now(), reason, raw });
      setStatus({ quarantined: true });
    } catch {
      logEvent({ event: "store_quarantine_failed", level: "error" });
      setStatus({ readOnly: true, setAsideFailed: true });
    }
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
          await enqueue(() => storage.set(STORE_KEY, state)).catch(() => setStatus({ saveFailed: true }));
        }
        break;
      case "future":
        logEvent({ event: "store_read_only", level: "warn", version: result.version });
        unreadable = raw;
        setStatus({ readOnly: true });
        break;
      case "invalid":
        unreadable = raw;
        await quarantine(raw, result.reason);
        break;
    }
    setStatus({ phase: "ready" });
    notify();
  }

  const load = (): Promise<void> => (loading ??= doLoad());

  /** What a write builds on: what is stored now, unless this tab holds changes the disk never got. */
  function baseOf(stored: unknown): StoreV1 {
    if (status.saveFailed) return state;
    const result = migrate(stored, migrations);
    if (result.kind === "empty" || result.kind === "ok") return result.state;
    // A bad value we already set aside is overwritten by the first save; anything else is left alone.
    if (result.kind === "invalid" && status.quarantined) return state;
    throw new UnreadableStoredError(stored);
  }

  /** Another tab left data here that this build must not overwrite. */
  function lockAgainst(stored: unknown): never {
    logEvent({ event: "store_read_only", level: "warn", reason: "found_at_write" });
    unreadable = stored;
    setStatus({ readOnly: true });
    notify();
    throw new ReadOnlyStoreError();
  }

  /** The disk refused the write: keep the change in memory for this session and say so. */
  function keepInMemory(change: (current: StoreV1) => unknown, error: unknown): never {
    logEvent({ event: "store_save_failed", level: "error", storage: storage.kind });
    state = deepFreeze(shareStructure(state, StoreV1.parse(change(state))));
    setStatus({ saveFailed: true });
    notify();
    throw error;
  }

  /** Applies `change` to what is stored, validates, saves, and adopts the result. */
  async function commit(change: (current: StoreV1) => unknown): Promise<void> {
    await load();
    if (status.readOnly) throw new ReadOnlyStoreError();
    const applied: { value?: StoreV1 } = {};
    let invalidChange: { readonly error: unknown } | undefined;
    try {
      await enqueue(() =>
        storage.update(STORE_KEY, (stored) => {
          const base = baseOf(stored);
          try {
            applied.value = StoreV1.parse(change(base));
          } catch (error) {
            invalidChange = { error };
            throw error;
          }
          return applied.value;
        }),
      );
    } catch (error) {
      if (error instanceof UnreadableStoredError) lockAgainst(error.stored);
      if (invalidChange !== undefined) throw invalidChange.error;
      keepInMemory(change, error);
    }
    if (applied.value === undefined) throw new Error("store update finished without a result");
    state = deepFreeze(shareStructure(state, applied.value));
    setStatus({ saveFailed: false });
    notify();
    announce();
  }

  const checkImport = (text: string): ParsedImport =>
    status.readOnly ? importFailure("read_only") : readImportFile(text, migrations);

  async function importAll(text: string): Promise<ImportResult> {
    await load();
    const parsed = checkImport(text);
    if (!parsed.ok) return parsed;
    const next = deepFreeze(parsed.state);
    try {
      await enqueue(() => storage.set(STORE_KEY, next));
    } catch {
      logEvent({ event: "store_import_save_failed", level: "error", storage: storage.kind });
      return importFailure("save_failed");
    }
    state = next;
    setStatus({ saveFailed: false });
    notify();
    announce();
    logEvent({ event: "store_imported", lifeStories: parsed.counts.lifeStories });
    return resultOf(parsed);
  }

  async function deleteAll(): Promise<void> {
    await load();
    try {
      await enqueue(async () => {
        for (const key of OWNED_KEYS) await storage.del(key);
      });
    } catch (error) {
      logEvent({ event: "store_delete_failed", level: "error", storage: storage.kind });
      throw error;
    }
    state = EMPTY_STORE;
    unreadable = undefined;
    setStatus({ readOnly: false, quarantined: false, setAsideFailed: false, saveFailed: false });
    notify();
    announce();
    logEvent({ event: "store_deleted_all" });
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
    exportAll: () => buildExportFile(state, now()),
    exportUnreadable() {
      if (unreadable === undefined) return null;
      const version = (unreadable as { schemaVersion?: unknown } | null)?.schemaVersion;
      const schemaVersion = typeof version === "number" && Number.isInteger(version) && version >= 0 ? version : 0;
      return JSON.stringify({ app: "memory-lane", schemaVersion, exportedAt: now(), data: unreadable });
    },
    previewImport: (text) => resultOf(checkImport(text)),
    importAll,
    deleteAll,
    close() {
      channel?.close();
      listeners.clear();
    },
  };
}
