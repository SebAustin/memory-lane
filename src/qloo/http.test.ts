import { describe, expect, it, vi } from "vitest";
import type { Logger } from "@/lib/log";
import { createTieredCache, FRESH_MS, STALE_MAX_MS, type KvCache } from "@/qloo/cache";
import { createCallBudget } from "@/qloo/budget";
import { DEFAULT_RETRY } from "@/qloo/backoff";
import { HttpQlooClient, type HttpQlooOptions } from "@/qloo/http";
import type { InsightsParams } from "@/qloo/types";

const BASE = "https://hackathon.api.qloo.com";
const KEY = "test-key-NOT-A-SECRET";
const DAY = 24 * 3_600_000;

type Step = Response | Error | "hang" | ((init: RequestInit) => Response | Promise<Response>);

/** A scripted `fetch`: each call takes the next step. It records every request. */
function scriptedFetch(...steps: Step[]) {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  const impl = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: new URL(String(input)), init });
    const step = steps[Math.min(calls.length - 1, steps.length - 1)];
    if (step === undefined) throw new Error("no scripted response");
    if (step === "hang") {
      return new Promise<Response>((_, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    }
    if (step instanceof Error) throw step;
    if (typeof step === "function") return step(init);
    // A fresh Response per call: cancelling one branch of a `clone()` would wait for the other.
    return new Response(await step.clone().text(), { status: step.status, headers: step.headers });
  });
  return { fetch: impl as unknown as typeof fetch, calls, impl };
}

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });
const status = (code: number, headers: Record<string, string> = {}) => new Response("", { status: code, headers });

const artist = (id: string, name = id.toUpperCase(), extra: Record<string, unknown> = {}) => ({
  entity_id: id,
  name,
  type: "urn:entity:artist",
  properties: { image: { url: "https://images.qloo.com/a.jpg" } },
  tags: [{ tag_id: "t-country", name: "Country" }],
  query: { affinity: 0.8, explainability: { "seed-1": 0.6 } },
  ...extra,
});
const insightsBody = (...entities: unknown[]) => ({ success: true, results: { entities } });

const MUSIC: InsightsParams = {
  filterType: "urn:entity:artist",
  interests: ["seed-1", "seed-2"],
  excludeEntities: ["x-1"],
  excludeTags: ["x-tag"],
  age: "55_and_older",
  locationQuery: "Memphis",
  explainability: true,
  take: 15,
};

interface Harness {
  readonly client: HttpQlooClient;
  readonly fetch: ReturnType<typeof scriptedFetch>;
  readonly sleeps: number[];
  readonly clock: { now: number };
  readonly cache: KvCache;
  readonly logs: Array<Parameters<Logger>[0]>;
}

function harness(steps: Step[], overrides: Partial<HttpQlooOptions> = {}): Harness {
  const fetch = scriptedFetch(...steps);
  const sleeps: number[] = [];
  const clock = { now: Date.parse("2026-10-04T12:00:00Z") };
  const cache = createTieredCache({ lruMax: 50 });
  const logs: Harness["logs"] = [];
  const client = new HttpQlooClient({
    baseUrl: BASE,
    apiKey: KEY,
    fetch: fetch.fetch,
    cache,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    random: () => 1,
    now: () => clock.now,
    imageHosts: ["images.qloo.com"],
    log: (event) => logs.push(event),
    ...overrides,
  });
  return { client, fetch, sleeps, clock, cache, logs };
}

describe("the request", () => {
  it("is a GET to the hackathon host with the key in the X-Api-Key header, never in the URL", async () => {
    const { client, fetch } = harness([json(insightsBody(artist("a-1")))]);

    await client.insights(MUSIC);

    const [{ url, init }] = fetch.calls;
    expect(url.origin).toBe(BASE);
    expect(url.pathname).toBe("/v2/insights");
    expect(init.method).toBe("GET");
    expect(new Headers(init.headers).get("x-api-key")).toBe(KEY);
    expect(url.toString()).not.toContain(KEY);
    expect(init.body).toBeUndefined();
  });

  it("refuses redirects, so the key can never follow one to another host", async () => {
    const { client, fetch } = harness([json(insightsBody(artist("a-1")))]);
    await client.insights(MUSIC);
    expect(fetch.calls[0]?.init.redirect).toBe("error");
  });

  it("uses Qloo's exact parameter names for insights", async () => {
    const { client, fetch } = harness([json(insightsBody(artist("a-1")))]);

    await client.insights({
      ...MUSIC,
      interestTags: ["t-1"],
      filterLocationQuery: "Germantown",
      releaseYear: { min: 1956, max: 1976 },
      priceLevelMax: 3,
      resultEntities: ["r-1", "r-2"],
    });

    expect(Object.fromEntries(fetch.calls[0]!.url.searchParams)).toEqual({
      "filter.type": "urn:entity:artist",
      "signal.interests.entities": "seed-1,seed-2",
      "signal.interests.tags": "t-1",
      "signal.demographics.age": "55_and_older",
      "signal.location.query": "Memphis",
      "filter.location.query": "Germantown",
      "filter.exclude.entities": "x-1",
      "filter.exclude.tags": "x-tag",
      "filter.results.entities": "r-1,r-2",
      "filter.release_year.min": "1956",
      "filter.release_year.max": "1976",
      "filter.price_level.max": "3",
      "feature.explainability": "true",
      take: "15",
    });
  });

  it("leaves absent parameters out", async () => {
    const { client, fetch } = harness([json(insightsBody(artist("a-1")))]);
    await client.insights({ filterType: "urn:entity:brand" });
    expect(Object.fromEntries(fetch.calls[0]!.url.searchParams)).toEqual({ "filter.type": "urn:entity:brand" });
  });

  it("sends search and tag lookups to their own endpoints", async () => {
    const search = harness([json({ results: [artist("a-1")] })]);
    await search.client.search({ query: "Patsy Cline", types: ["urn:entity:artist", "urn:entity:movie"], take: 10 });
    expect(search.fetch.calls[0]!.url.pathname).toBe("/search");
    expect(Object.fromEntries(search.fetch.calls[0]!.url.searchParams)).toEqual({
      query: "Patsy Cline",
      types: "urn:entity:artist,urn:entity:movie",
      take: "10",
    });

    const tags = harness([json({ results: { tags: [{ tag_id: "t-1", name: "Hospitals" }] } })]);
    await tags.client.tags({ query: "hospitals", take: 5 });
    expect(tags.fetch.calls[0]!.url.pathname).toBe("/v2/tags");
    expect(Object.fromEntries(tags.fetch.calls[0]!.url.searchParams)).toEqual({
      "filter.query": "hospitals",
      "feature.semantic_search": "true",
      take: "5",
    });
  });

  it("tolerates a trailing slash on the base URL", async () => {
    const { client, fetch } = harness([json(insightsBody(artist("a-1")))], { baseUrl: `${BASE}/` });
    await client.insights(MUSIC);
    expect(fetch.calls[0]!.url.pathname).toBe("/v2/insights");
  });
});

describe("the answer", () => {
  it("normalizes entities and keeps provenance free of text", async () => {
    const { client } = harness([json(insightsBody(artist("a-1", "Patsy Cline"), artist("a-2")))]);

    const env = await client.insights(MUSIC);

    expect(env.status).toBe("ok");
    expect(env.data?.entities.map((e) => [e.entityId, e.name, e.domain, e.affinity])).toEqual([
      ["a-1", "Patsy Cline", "music", 0.8],
      ["a-2", "A-2", "music", 0.8],
    ]);
    expect(env.data?.entities[0]?.explainability).toEqual({ "seed-1": 0.6 });
    expect(env.provenance).toMatchObject({ endpoint: "/v2/insights", cached: false, stale: false, retries: 0 });
    expect(env.provenance.synthetic).toBeUndefined();
  });

  it("scrubs an image on a host that is not allow-listed", async () => {
    const onList = artist("a-1");
    const offList = artist("a-2", "Two", { properties: { image: "https://evil.example/x.jpg" } });
    const { client } = harness([json(insightsBody(onList, offList))]);

    const env = await client.insights(MUSIC);

    expect(env.data?.entities.map((e) => e.imageUrl)).toEqual(["https://images.qloo.com/a.jpg", null]);
  });

  it("answers empty, not error, when Qloo returns no results", async () => {
    const { client } = harness([json(insightsBody())]);
    const env = await client.insights(MUSIC);
    expect(env).toMatchObject({ status: "empty", data: { entities: [] } });
  });

  it("returns fingerprint tags with their affinity for a urn:tag request", async () => {
    const body = { results: { tags: [{ tag_id: "t-1", name: "Country", query: { affinity: 0.9 } }] } };
    const { client } = harness([json(body)]);

    const env = await client.insights({ filterType: "urn:tag", interests: ["seed-1"], take: 20 });

    expect(env.status).toBe("ok");
    expect(env.data?.tags).toEqual([{ id: "t-1", name: "Country", affinity: 0.9 }]);
  });

  it("drops an unusable entity but keeps the usable ones", async () => {
    const { client } = harness([json(insightsBody({ nonsense: true }, artist("a-1")))]);
    const env = await client.insights(MUSIC);
    expect(env.data?.entities.map((e) => e.entityId)).toEqual(["a-1"]);
  });
});

describe("schema errors", () => {
  it.each([
    ["a body that is not JSON", new Response("<html>oops</html>", { status: 200 })],
    ["JSON with no results", json({ success: true })],
    ["results of the wrong type", json({ results: "none" })],
    ["entities that are all unusable", json(insightsBody({ a: 1 }, { b: 2 }))],
  ])("maps %s to 'schema' without retrying", async (_label, response) => {
    const { client, fetch, sleeps } = harness([response]);

    const env = await client.insights(MUSIC);

    expect(env).toMatchObject({ status: "error", data: null, errorCode: "schema" });
    expect(fetch.calls).toHaveLength(1);
    expect(sleeps).toEqual([]);
  });

  it("maps a bad search or tags body to 'schema' too", async () => {
    const search = harness([json({ results: { not: "a list" } })]);
    expect((await search.client.search({ query: "x", types: ["urn:entity:artist"] })).errorCode).toBe("schema");
    const tags = harness([json({ results: [] })]);
    expect((await tags.client.tags({ query: "x" })).errorCode).toBe("schema");
  });
});

describe("retries (NFR-18)", () => {
  it.each([429, 500, 502, 503, 504])("retries a %s, then returns the good answer", async (code) => {
    const { client, fetch } = harness([status(code), json(insightsBody(artist("a-1")))]);

    const env = await client.insights(MUSIC);

    expect(env.status).toBe("ok");
    expect(env.provenance.retries).toBe(1);
    expect(fetch.calls).toHaveLength(2);
  });

  it("waits with full-jitter backoff between attempts", async () => {
    const { client, sleeps } = harness([status(500), status(500), status(500), json(insightsBody(artist("a-1")))]);

    await client.insights(MUSIC);

    // random() is 1, so each wait is the ceiling: 250, 500, 1000.
    expect(sleeps).toEqual([250, 500, 1000]);
  });

  it("gives up after 3 retries (4 requests) and names the failure", async () => {
    const { client, fetch } = harness([status(503)]);

    const env = await client.insights(MUSIC);

    expect(env).toMatchObject({ status: "error", data: null, errorCode: "upstream" });
    expect(env.provenance.retries).toBe(3);
    expect(fetch.calls).toHaveLength(4);
  });

  it("reports rate_limited when 429 outlasts the retries", async () => {
    const { client } = harness([status(429)]);
    expect((await client.insights(MUSIC)).errorCode).toBe("rate_limited");
  });

  it("honours Retry-After, but waits at most 2 s", async () => {
    const { client, sleeps } = harness([
      status(429, { "retry-after": "1" }),
      status(429, { "retry-after": "30" }),
      json(insightsBody(artist("a-1"))),
    ]);

    await client.insights(MUSIC);

    expect(sleeps).toEqual([1000, 2000]);
  });

  it.each([
    [400, "bad_param"],
    [401, "auth"],
    [404, "bad_param"],
    [422, "bad_param"],
    [418, "upstream"],
  ])("does not retry a %s, and maps it to '%s'", async (code, errorCode) => {
    const { client, fetch } = harness([status(code)]);

    const env = await client.insights(MUSIC);

    expect(env).toMatchObject({ status: "error", errorCode });
    expect(fetch.calls).toHaveLength(1);
  });

  it("maps a 403 to unsupported_type for insights and auth for search and tags", async () => {
    const insights = harness([status(403)]);
    expect((await insights.client.insights(MUSIC)).errorCode).toBe("unsupported_type");
    expect(insights.fetch.calls).toHaveLength(1);

    const search = harness([status(403)]);
    expect((await search.client.search({ query: "x", types: ["urn:entity:artist"] })).errorCode).toBe("auth");
    const tags = harness([status(403)]);
    expect((await tags.client.tags({ query: "x" })).errorCode).toBe("auth");
  });

  it("does not retry a network failure", async () => {
    const { client, fetch } = harness([new TypeError("fetch failed")]);

    const env = await client.insights(MUSIC);

    expect(env).toMatchObject({ status: "error", errorCode: "upstream" });
    expect(fetch.calls).toHaveLength(1);
  });

  it("never throws, even when fetch throws something odd", async () => {
    const { client } = harness([], {
      fetch: (() => {
        throw "not even an Error";
      }) as unknown as typeof fetch,
    });
    await expect(client.insights(MUSIC)).resolves.toMatchObject({ status: "error", errorCode: "upstream" });
  });
});

describe("timeouts", () => {
  const FAST = { ...DEFAULT_RETRY, attemptTimeoutMs: 15 };

  it("abandons an attempt that takes too long and retries it", async () => {
    const { client, fetch } = harness(["hang", json(insightsBody(artist("a-1")))], { retry: FAST });

    const env = await client.insights(MUSIC);

    expect(env.status).toBe("ok");
    expect(env.provenance.retries).toBe(1);
    expect(fetch.calls).toHaveLength(2);
  });

  it("reports timeout once the retries are spent", async () => {
    const { client, fetch } = harness(["hang"], { retry: { ...FAST, maxRetries: 2 } });

    const env = await client.insights(MUSIC);

    expect(env).toMatchObject({ status: "error", errorCode: "timeout" });
    expect(fetch.calls).toHaveLength(3);
  });

  it("allows 8 s per attempt by default", () => {
    expect(DEFAULT_RETRY.attemptTimeoutMs).toBe(8000);
    expect(DEFAULT_RETRY.maxRetries).toBe(3);
  });
});

describe("abort", () => {
  it("does nothing at all when the signal is already aborted", async () => {
    const { client, fetch } = harness([json(insightsBody(artist("a-1")))]);
    const controller = new AbortController();
    controller.abort();

    const env = await client.insights(MUSIC, { signal: controller.signal });

    expect(env).toMatchObject({ status: "error", errorCode: "aborted" });
    expect(fetch.calls).toHaveLength(0);
  });

  it("aborts the fetch in flight", async () => {
    const { client, fetch } = harness(["hang"], { retry: { ...DEFAULT_RETRY, attemptTimeoutMs: 60_000 } });
    const controller = new AbortController();

    const pending = client.insights(MUSIC, { signal: controller.signal });
    await vi.waitFor(() => expect(fetch.calls).toHaveLength(1));
    controller.abort();

    expect(await pending).toMatchObject({ status: "error", errorCode: "aborted" });
    expect(fetch.calls[0]!.init.signal?.aborted).toBe(true);
  });

  it("aborts a backoff wait and makes no further request", async () => {
    const fetch = scriptedFetch(status(500), json(insightsBody(artist("a-1"))));
    let release!: () => void;
    const neverEnds = new Promise<void>((resolve) => {
      release = resolve;
    });
    const client = new HttpQlooClient({
      baseUrl: BASE,
      apiKey: KEY,
      fetch: fetch.fetch,
      cache: createTieredCache({ lruMax: 5 }),
      sleep: () => neverEnds,
      random: () => 1,
      log: () => undefined,
    });
    const controller = new AbortController();

    const pending = client.insights(MUSIC, { signal: controller.signal });
    await vi.waitFor(() => expect(fetch.calls).toHaveLength(1));
    controller.abort();

    expect(await pending).toMatchObject({ status: "error", errorCode: "aborted" });
    expect(fetch.calls).toHaveLength(1);
    release();
  });
});

describe("the two-tier cache (NFR-8)", () => {
  it("answers a repeated ask from the cache with no new request", async () => {
    const { client, fetch } = harness([json(insightsBody(artist("a-1")))]);

    await client.insights(MUSIC);
    const again = await client.insights(MUSIC);

    expect(fetch.calls).toHaveLength(1);
    expect(again.status).toBe("ok");
    expect(again.provenance).toMatchObject({ cached: true, stale: false });
    expect(again.data?.entities[0]?.entityId).toBe("a-1");
  });

  it("treats a different ask as a different entry", async () => {
    const { client, fetch } = harness([json(insightsBody(artist("a-1")))]);
    await client.insights(MUSIC);
    await client.insights({ ...MUSIC, locationQuery: "Leeds" });
    expect(fetch.calls).toHaveLength(2);
  });

  it("refetches insights after 24 h, but keeps serving search for 7 d", async () => {
    const { client, fetch, clock } = harness([
      json(insightsBody(artist("a-1"))),
      json({ results: [artist("a-1")] }),
      json(insightsBody(artist("a-2"))),
    ]);
    await client.insights(MUSIC);
    await client.search({ query: "Patsy", types: ["urn:entity:artist"] });

    clock.now += FRESH_MS.insights + 1;
    const insights = await client.insights(MUSIC);
    const search = await client.search({ query: "Patsy", types: ["urn:entity:artist"] });

    expect(insights.data?.entities[0]?.entityId).toBe("a-2");
    expect(search.provenance.cached).toBe(true);
    expect(fetch.calls).toHaveLength(3);
  });

  it("serves a stale answer as 'degraded' when Qloo is failing (stale-on-error)", async () => {
    const { client, clock } = harness([json(insightsBody(artist("a-1"))), status(429)]);
    await client.insights(MUSIC);

    clock.now += 3 * DAY;
    const env = await client.insights(MUSIC);

    expect(env.status).toBe("degraded");
    expect(env.data?.entities.map((e) => e.entityId)).toEqual(["a-1"]);
    expect(env.provenance).toMatchObject({ cached: true, stale: true, retries: 3 });
    expect(env.errorCode).toBeUndefined();
  });

  it("serves stale on a timeout too, and on a bad response", async () => {
    const timeouts = harness([json(insightsBody(artist("a-1"))), "hang"], {
      retry: { ...DEFAULT_RETRY, attemptTimeoutMs: 10, maxRetries: 1 },
    });
    await timeouts.client.insights(MUSIC);
    timeouts.clock.now += 2 * DAY;
    expect((await timeouts.client.insights(MUSIC)).status).toBe("degraded");

    const broken = harness([json(insightsBody(artist("a-1"))), json({ results: "garbage" })]);
    await broken.client.insights(MUSIC);
    broken.clock.now += 2 * DAY;
    expect((await broken.client.insights(MUSIC)).status).toBe("degraded");
  });

  it("does not serve an entry older than 7 d", async () => {
    const { client, clock } = harness([json(insightsBody(artist("a-1"))), status(500)]);
    await client.insights(MUSIC);

    clock.now += STALE_MAX_MS + 1;
    const env = await client.insights(MUSIC);

    expect(env).toMatchObject({ status: "error", errorCode: "upstream" });
  });

  it("does not hide a caller's abort behind a stale answer", async () => {
    const { client, clock } = harness([json(insightsBody(artist("a-1"))), "hang"], {
      retry: { ...DEFAULT_RETRY, attemptTimeoutMs: 60_000 },
    });
    await client.insights(MUSIC);
    clock.now += 2 * DAY;
    const controller = new AbortController();

    const pending = client.insights(MUSIC, { signal: controller.signal });
    await new Promise((resolve) => setTimeout(resolve, 10));
    controller.abort();

    expect(await pending).toMatchObject({ status: "error", errorCode: "aborted" });
  });

  it("shares one request between identical concurrent asks", async () => {
    const { client, fetch } = harness([json(insightsBody(artist("a-1")))]);

    const [a, b] = await Promise.all([client.insights(MUSIC), client.insights(MUSIC)]);

    expect(fetch.calls).toHaveLength(1);
    expect(a.data?.entities[0]?.entityId).toBe("a-1");
    expect(b.data?.entities[0]?.entityId).toBe("a-1");
  });

  it("keys the cache by a hash that holds no readable text", async () => {
    const keys: string[] = [];
    const spy: KvCache = {
      get: async (key) => {
        keys.push(key);
        return undefined;
      },
      set: async (key) => {
        keys.push(key);
      },
    };
    const { client } = harness([json(insightsBody(artist("a-1"))), json({ results: [] })], { cache: spy });

    await client.insights({ ...MUSIC, locationQuery: "Memphis" });
    await client.search({ query: "Doris Day", types: ["urn:entity:artist"] });

    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("survives a cache that fails", async () => {
    const broken: KvCache = {
      get: () => Promise.reject(new Error("cache down")),
      set: () => Promise.reject(new Error("cache down")),
    };
    const { client } = harness([json(insightsBody(artist("a-1")))], { cache: broken });
    expect((await client.insights(MUSIC)).status).toBe("ok");
  });

  it("refetches when a cached entry no longer has a usable shape", async () => {
    const poisoned: KvCache = {
      get: async () => ({ value: { results: "garbage" }, storedAt: Date.parse("2026-10-04T12:00:00Z") }),
      set: async () => undefined,
    };
    const { client, fetch } = harness([json(insightsBody(artist("a-1")))], { cache: poisoned });
    const env = await client.insights(MUSIC);
    expect(env.status).toBe("ok");
    expect(fetch.calls).toHaveLength(1);
  });
});

describe("the call budget (SC-13)", () => {
  it("returns 'budget' and makes no HTTP call once the budget is spent", async () => {
    const { client, fetch } = harness([json(insightsBody(artist("a-1")))]);
    const budget = createCallBudget(1, { agent: 0 });

    const first = await client.insights(MUSIC, { budget });
    const second = await client.insights({ ...MUSIC, locationQuery: "Leeds" }, { budget });

    expect(first.status).toBe("ok");
    expect(second).toMatchObject({ status: "error", data: null, errorCode: "budget" });
    expect(fetch.calls).toHaveLength(1);
  });

  it("keeps the agent reserve out of reach of prefetch", async () => {
    const { client, fetch } = harness([json(insightsBody(artist("a-1")))]);
    const budget = createCallBudget(16, { agent: 4 });

    const results = [];
    for (let i = 0; i < 13; i += 1) {
      results.push(await client.insights({ ...MUSIC, locationQuery: `City ${i}` }, { budget }));
    }

    expect(results.filter((r) => r.errorCode === "budget")).toHaveLength(1);
    expect(fetch.calls).toHaveLength(12);
    expect(budget.remaining("agent")).toBe(4);

    const agent = await client.insights({ ...MUSIC, locationQuery: "Agent City" }, { budget, budgetKind: "agent" });
    expect(agent.status).toBe("ok");
    expect(fetch.calls).toHaveLength(13);
  });

  it("does not spend budget on an answer from the cache", async () => {
    const { client } = harness([json(insightsBody(artist("a-1")))]);
    const budget = createCallBudget(1, { agent: 0 });

    await client.insights(MUSIC, { budget });
    const cached = await client.insights(MUSIC, { budget });

    expect(cached.provenance.cached).toBe(true);
    expect(budget.remaining("prefetch")).toBe(0);
    expect(budget.used()).toEqual({ prefetch: 1, agent: 0 });
  });

  it("spends one unit per request, however many retries it needs", async () => {
    const { client } = harness([status(500), status(500), json(insightsBody(artist("a-1")))]);
    const budget = createCallBudget(16, { agent: 4 });

    await client.insights(MUSIC, { budget });

    expect(budget.used().prefetch).toBe(1);
  });
});

describe("validation before any call (L4)", () => {
  it.each([0, -1, 2.5, Number.NaN, 51])("answers bad_param for take = %s, with no request", async (take) => {
    const { client, fetch } = harness([json(insightsBody(artist("a-1")))]);
    const budget = createCallBudget(16, { agent: 4 });

    const env = await client.insights({ ...MUSIC, take }, { budget });

    expect(env).toMatchObject({ status: "error", data: null, errorCode: "bad_param" });
    expect(env.hint).toMatch(/take/);
    expect(fetch.calls).toHaveLength(0);
    expect(budget.used()).toEqual({ prefetch: 0, agent: 0 });
  });
});

describe("logging", () => {
  it("logs one structured line per call, with no params, text or key", async () => {
    const { client, logs } = harness([json(insightsBody(artist("a-1", "Patsy Cline")))]);

    await client.insights({ ...MUSIC, locationQuery: "Memphis" });

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ event: "qloo.call", endpoint: "/v2/insights", status: "ok", cached: false, retries: 0 });
    const line = JSON.stringify(logs[0]);
    expect(line).not.toContain("Memphis");
    expect(line).not.toContain("Patsy");
    expect(line).not.toContain(KEY);
  });

  it("flags failures as warnings", async () => {
    const { client, logs } = harness([status(401)]);
    await client.insights(MUSIC);
    expect(logs[0]).toMatchObject({ level: "warn", status: "error", errorCode: "auth" });
  });
});

describe("timing", () => {
  it("reports how long the call took by the injected clock", async () => {
    const { client, clock } = harness([
      () => {
        clock.now += 120;
        return json(insightsBody(artist("a-1")));
      },
    ]);
    const env = await client.insights(MUSIC);
    expect(env.provenance.ms).toBe(120);
  });
});
