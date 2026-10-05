import { createStore, del, get, set, update, type UseStore } from "idb-keyval";

/** Where a store actually lives. `memory` means nothing survives a reload. */
export type StorageKind = "indexeddb" | "memory";

/**
 * The seam under the repository (PLAN section 3.7, seam 7): a tiny async
 * key-value store. Values are structured-cloned in and out, so a caller can
 * never hold a reference into what is stored.
 */
export interface KeyValueStorage {
  readonly kind: StorageKind;
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  /**
   * Reads, changes and writes one key as a single step. `change` receives what
   * is stored right now (not what this tab remembers) and must be synchronous.
   * If it throws, nothing is written and the error comes back.
   */
  update(key: string, change: (current: unknown) => unknown): Promise<void>;
}

/** The parts of a storage a simple backend has to provide. */
export type KeyValueParts = Omit<KeyValueStorage, "update">;

/**
 * Builds a full storage from the three basic operations. `update` is a plain
 * read then write, so it is only as safe from a second tab as the backend
 * itself: real adapters provide a transactional one. Handy for tests.
 */
export function storageFrom(parts: KeyValueParts): KeyValueStorage {
  return {
    kind: parts.kind,
    get: parts.get,
    set: parts.set,
    del: parts.del,
    update: async (key, change) => parts.set(key, change(await parts.get(key))),
  };
}

/** An in-memory adapter: the test double, and the fallback when IndexedDB is not available. */
export function memoryStorage(): KeyValueStorage {
  const data = new Map<string, unknown>();
  return {
    kind: "memory",
    get: async (key) => (data.has(key) ? structuredClone(data.get(key)) : undefined),
    set: async (key, value) => {
      data.set(key, structuredClone(value));
    },
    del: async (key) => {
      data.delete(key);
    },
    // Nothing awaits between the read and the write, so no other caller can interleave.
    update: async (key, change) => {
      const next = change(data.has(key) ? structuredClone(data.get(key)) : undefined);
      data.set(key, structuredClone(next));
    },
  };
}

const DEFAULT_DB_NAME = "memory-lane";
const OBJECT_STORE_NAME = "kv";

/**
 * An IndexedDB adapter over `idb-keyval`. The database is opened on first use,
 * not at construction, so building one on a server (or in a test that never
 * touches it) costs nothing and cannot throw.
 */
export function idbStorage({ dbName = DEFAULT_DB_NAME }: { dbName?: string } = {}): KeyValueStorage {
  let store: UseStore | undefined;
  const open = (): UseStore => (store ??= createStore(dbName, OBJECT_STORE_NAME));
  return {
    kind: "indexeddb",
    get: (key) => get(key, open()),
    set: (key, value) => set(key, value, open()),
    del: (key) => del(key, open()),
    // One readwrite transaction, so a second tab cannot slip a write in between.
    update: (key, change) => update(key, change, open()),
  };
}

/** IndexedDB when the browser has it, otherwise memory. No cookies, ever (NFR-10). */
export function defaultStorage(): KeyValueStorage {
  return typeof indexedDB === "undefined" ? memoryStorage() : idbStorage();
}
