import "server-only";
import { LRUCache } from "lru-cache";

/**
 * The two-tier Qloo cache and its helpers (PLAN 5.2, NFR-8): an in-process LRU
 * in front of the Vercel Runtime Cache, with freshness decided by the caller
 * from the record's age. It is best effort: a cache failure is a miss, never
 * an error (seam 4).
 */

/** What is stored per request: the raw response body and when it was stored (epoch ms). */
export interface CacheRecord {
  readonly value: unknown;
  readonly storedAt: number;
}

/** Seam 4. Implementations never throw. */
export interface KvCache {
  get(key: string): Promise<CacheRecord | undefined>;
  set(key: string, record: CacheRecord): Promise<void>;
}

/** The part of `@vercel/functions`' `RuntimeCache` this module uses. */
export interface RuntimeCacheLike {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, options?: { name?: string; tags?: string[]; ttl?: number }): Promise<void>;
}

export const CACHE_NAMESPACE = "qloo";
export const CACHE_TAG = "qloo-v1";

const HOUR_MS = 3_600_000;
export type CacheKind = "insights" | "compare" | "search" | "tags";

/** How long a record counts as fresh, by what it answers. */
export const FRESH_MS: Readonly<Record<CacheKind, number>> = {
  insights: 24 * HOUR_MS,
  compare: 24 * HOUR_MS,
  search: 7 * 24 * HOUR_MS,
  tags: 7 * 24 * HOUR_MS,
};

/** The oldest record that may still be served when Qloo fails. */
export const STALE_MAX_MS = 7 * 24 * HOUR_MS;

export type Freshness = "fresh" | "stale" | "expired";

export function freshness(kind: CacheKind, record: CacheRecord, nowMs: number): Freshness {
  const age = Math.max(0, nowMs - record.storedAt);
  if (age < FRESH_MS[kind]) return "fresh";
  return age <= STALE_MAX_MS ? "stale" : "expired";
}

function isRecord(value: unknown): value is CacheRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "storedAt" in value &&
    typeof (value as { storedAt: unknown }).storedAt === "number"
  );
}

export interface TieredCacheOptions {
  readonly lruMax: number;
  /** The shared tier, or a function that finds it on each use (the Runtime Cache is tied to the request context). */
  readonly runtime?: RuntimeCacheLike | (() => RuntimeCacheLike | undefined);
}

/** An LRU of `lruMax` records in front of the runtime cache. */
export function createTieredCache({ lruMax, runtime }: TieredCacheOptions): KvCache {
  const lru = new LRUCache<string, CacheRecord>({ max: lruMax });
  const shared = (): RuntimeCacheLike | undefined => (typeof runtime === "function" ? runtime() : runtime);

  return {
    async get(key) {
      const local = lru.get(key);
      if (local !== undefined) return local;
      try {
        const remote = await shared()?.get(key);
        if (!isRecord(remote)) return undefined;
        lru.set(key, remote);
        return remote;
      } catch {
        return undefined;
      }
    },
    async set(key, record) {
      lru.set(key, record);
      try {
        await shared()?.set(key, record, {
          name: CACHE_NAMESPACE,
          tags: [CACHE_TAG],
          ttl: STALE_MAX_MS / 1000,
        });
      } catch {
        // Best effort: the LRU already has it.
      }
    },
  };
}

/**
 * Runs `load` once for concurrent callers with the same `key`. The shared
 * load is cancelled only when every caller has aborted, so one visitor
 * disconnecting never cuts off another's request. A caller that aborts gets
 * an `AbortError` straight away.
 */
export type Deduper = <T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  caller?: AbortSignal,
) => Promise<T>;

interface Flight {
  readonly promise: Promise<unknown>;
  readonly controller: AbortController;
  waiters: number;
}

const abortError = (): DOMException => new DOMException("The call was aborted", "AbortError");

export function createDeduper(): Deduper {
  const flights = new Map<string, Flight>();

  return <T>(key: string, load: (signal: AbortSignal) => Promise<T>, caller?: AbortSignal): Promise<T> => {
    if (caller?.aborted) return Promise.reject(abortError());

    let flight = flights.get(key);
    if (flight === undefined) {
      const controller = new AbortController();
      const promise = load(controller.signal).finally(() => {
        if (flights.get(key)?.promise === promise) flights.delete(key);
      });
      flight = { promise, controller, waiters: 0 };
      flights.set(key, flight);
    }
    const joined = flight;
    joined.waiters += 1;

    if (caller === undefined) return joined.promise as Promise<T>;
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        joined.waiters -= 1;
        if (joined.waiters === 0) joined.controller.abort();
        reject(abortError());
      };
      caller.addEventListener("abort", onAbort, { once: true });
      (joined.promise as Promise<T>).then(
        (value) => {
          caller.removeEventListener("abort", onAbort);
          resolve(value);
        },
        (error: unknown) => {
          caller.removeEventListener("abort", onAbort);
          reject(error);
        },
      );
    });
  };
}
