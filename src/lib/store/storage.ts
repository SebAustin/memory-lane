import { createStore, del, get, set, type UseStore } from "idb-keyval";

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
  };
}

/** IndexedDB when the browser has it, otherwise memory. No cookies, ever (NFR-10). */
export function defaultStorage(): KeyValueStorage {
  return typeof indexedDB === "undefined" ? memoryStorage() : idbStorage();
}
