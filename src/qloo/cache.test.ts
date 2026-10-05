import { describe, expect, it, vi } from "vitest";
import {
  CACHE_NAMESPACE,
  CACHE_TAG,
  createDeduper,
  createTieredCache,
  freshness,
  FRESH_MS,
  STALE_MAX_MS,
  type CacheRecord,
  type RuntimeCacheLike,
} from "@/qloo/cache";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function fakeRuntime(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial));
  const runtime: RuntimeCacheLike & { sets: Array<{ key: string; options?: object }> } = {
    sets: [],
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown, options?: object) => {
      store.set(key, value);
      runtime.sets.push({ key, options });
    }),
  };
  return { runtime, store };
}

const record = (value: unknown, storedAt = 1_000): CacheRecord => ({ value, storedAt });

describe("freshness windows (PLAN 5.2)", () => {
  it("insights and compare stay fresh for 24 h; search and tags for 7 d", () => {
    expect(FRESH_MS.insights).toBe(DAY);
    expect(FRESH_MS.compare).toBe(DAY);
    expect(FRESH_MS.search).toBe(7 * DAY);
    expect(FRESH_MS.tags).toBe(7 * DAY);
  });

  it("is fresh inside the window, stale after it, expired after 7 d", () => {
    const stored = record("x", 0);
    expect(freshness("insights", stored, DAY - 1)).toBe("fresh");
    expect(freshness("insights", stored, DAY)).toBe("stale");
    expect(freshness("insights", stored, STALE_MAX_MS)).toBe("stale");
    expect(freshness("insights", stored, STALE_MAX_MS + 1)).toBe("expired");
  });

  it("keeps search fresh for the full 7 d", () => {
    const stored = record("x", 0);
    expect(freshness("search", stored, 6 * DAY)).toBe("fresh");
    expect(freshness("search", stored, 7 * DAY + 1)).toBe("expired");
  });

  it("treats a record from the future as fresh rather than negative age", () => {
    expect(freshness("insights", record("x", 5_000), 1_000)).toBe("fresh");
  });
});

describe("createTieredCache", () => {
  it("serves from the LRU without asking the runtime cache", async () => {
    const { runtime } = fakeRuntime();
    const cache = createTieredCache({ lruMax: 10, runtime });
    await cache.set("k", record("v"));
    vi.mocked(runtime.get).mockClear();

    expect(await cache.get("k")).toEqual(record("v"));
    expect(runtime.get).not.toHaveBeenCalled();
  });

  it("falls back to the runtime cache, then fills the LRU", async () => {
    const { runtime } = fakeRuntime({ k: record("from-runtime") });
    const cache = createTieredCache({ lruMax: 10, runtime });

    expect(await cache.get("k")).toEqual(record("from-runtime"));
    vi.mocked(runtime.get).mockClear();
    expect(await cache.get("k")).toEqual(record("from-runtime"));
    expect(runtime.get).not.toHaveBeenCalled();
  });

  it("writes to both tiers, tagged qloo-v1 and kept for 7 d", async () => {
    const { runtime } = fakeRuntime();
    const cache = createTieredCache({ lruMax: 10, runtime });

    await cache.set("k", record("v"));

    expect(runtime.sets).toEqual([
      { key: "k", options: { name: CACHE_NAMESPACE, tags: [CACHE_TAG], ttl: STALE_MAX_MS / 1000 } },
    ]);
  });

  it("answers undefined on a miss in both tiers", async () => {
    const cache = createTieredCache({ lruMax: 10, runtime: fakeRuntime().runtime });
    expect(await cache.get("nope")).toBeUndefined();
  });

  it("ignores a runtime entry of the wrong shape", async () => {
    const { runtime } = fakeRuntime({ k: { unexpected: true }, j: "text", n: null });
    const cache = createTieredCache({ lruMax: 10, runtime });
    expect(await cache.get("k")).toBeUndefined();
    expect(await cache.get("j")).toBeUndefined();
    expect(await cache.get("n")).toBeUndefined();
  });

  it("works with the LRU alone when there is no runtime cache", async () => {
    const cache = createTieredCache({ lruMax: 10 });
    await cache.set("k", record("v"));
    expect(await cache.get("k")).toEqual(record("v"));
  });

  it("evicts the least recently used entry past lruMax", async () => {
    const cache = createTieredCache({ lruMax: 2 });
    await cache.set("a", record(1));
    await cache.set("b", record(2));
    await cache.get("a");
    await cache.set("c", record(3));

    expect(await cache.get("b")).toBeUndefined();
    expect(await cache.get("a")).toEqual(record(1));
    expect(await cache.get("c")).toEqual(record(3));
  });

  it("never throws when the runtime cache does: the cache is best effort", async () => {
    const runtime: RuntimeCacheLike = {
      get: vi.fn().mockRejectedValue(new Error("down")),
      set: vi.fn().mockRejectedValue(new Error("down")),
    };
    const cache = createTieredCache({ lruMax: 10, runtime });

    await expect(cache.set("k", record("v"))).resolves.toBeUndefined();
    expect(await cache.get("k")).toEqual(record("v"));
    expect(await cache.get("other")).toBeUndefined();
  });

  it("accepts a runtime cache that is resolved lazily, per use", async () => {
    const { runtime } = fakeRuntime();
    let calls = 0;
    const cache = createTieredCache({
      lruMax: 10,
      runtime: () => {
        calls += 1;
        return runtime;
      },
    });
    await cache.set("k", record("v"));
    await cache.get("missing");
    expect(calls).toBe(2);
  });

  it("copes with a lazy runtime that has none available", async () => {
    const cache = createTieredCache({ lruMax: 10, runtime: () => undefined });
    await cache.set("k", record("v"));
    expect(await cache.get("k")).toEqual(record("v"));
    expect(await cache.get("zzz")).toBeUndefined();
  });
});

describe("createDeduper (in-flight requests are shared)", () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  it("runs one load for concurrent callers with the same key", async () => {
    const dedupe = createDeduper();
    const gate = deferred<string>();
    const load = vi.fn(() => gate.promise);

    const first = dedupe("k", load);
    const second = dedupe("k", load);
    gate.resolve("answer");

    expect(await first).toBe("answer");
    expect(await second).toBe("answer");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not share across keys, or after the first load finished", async () => {
    const dedupe = createDeduper();
    const load = vi.fn(async () => "x");

    await Promise.all([dedupe("a", load), dedupe("b", load)]);
    await dedupe("a", load);

    expect(load).toHaveBeenCalledTimes(3);
  });

  it("lets the next caller retry after a failed load", async () => {
    const dedupe = createDeduper();
    const load = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");

    await expect(dedupe("k", load)).rejects.toThrow("boom");
    expect(await dedupe("k", load)).toBe("ok");
  });

  it("lets one caller abort without cutting off the others", async () => {
    const dedupe = createDeduper();
    const gate = deferred<string>();
    let loadSignal: AbortSignal | undefined;
    const load = (signal: AbortSignal) => {
      loadSignal = signal;
      return gate.promise;
    };
    const aborter = new AbortController();

    const leaving = dedupe("k", load, aborter.signal);
    const staying = dedupe("k", load);
    aborter.abort();

    await expect(leaving).rejects.toMatchObject({ name: "AbortError" });
    expect(loadSignal?.aborted).toBe(false);
    gate.resolve("still here");
    expect(await staying).toBe("still here");
  });

  it("cancels the shared load once every caller has gone", async () => {
    const dedupe = createDeduper();
    const gate = deferred<string>();
    let loadSignal: AbortSignal | undefined;
    const load = (signal: AbortSignal) => {
      loadSignal = signal;
      return gate.promise;
    };
    const one = new AbortController();
    const two = new AbortController();

    const a = dedupe("k", load, one.signal);
    const b = dedupe("k", load, two.signal);
    one.abort();
    expect(loadSignal?.aborted).toBe(false);
    two.abort();

    await expect(a).rejects.toMatchObject({ name: "AbortError" });
    await expect(b).rejects.toMatchObject({ name: "AbortError" });
    expect(loadSignal?.aborted).toBe(true);
    gate.resolve("late");
  });

  it("rejects at once for a caller whose signal is already aborted", async () => {
    const dedupe = createDeduper();
    const load = vi.fn(async () => "x");
    const aborter = new AbortController();
    aborter.abort();

    await expect(dedupe("k", load, aborter.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(load).not.toHaveBeenCalled();
  });
});
