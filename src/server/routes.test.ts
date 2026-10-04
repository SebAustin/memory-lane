import { describe, expect, it, vi } from "vitest";
import { getServerConfig } from "@/config/server-config";
import { createQlooClient } from "@/qloo";
import type { QlooClient } from "@/qloo/types";
import { createClientKey } from "@/server/clientKey";
import { createResolveHandler, type ResolveHandlerDeps } from "@/server/handlers/resolve";
import { createRateLimiter } from "@/server/rateLimit";
import type { LogEvent } from "@/lib/log";

/**
 * `/api/resolve` through seam 8 (handler factories) and seam 9
 * (`getServerConfig`): SC-12 (400 and 413 generic) and NFR-15 (429 with
 * Retry-After). More routes join this file as their tickets land.
 */

const config = (env: Record<string, string> = {}) => getServerConfig({ QLOO_MODE: "fixture", ...env });

function setup(env: Record<string, string> = {}, overrides: Partial<ResolveHandlerDeps> = {}) {
  let now = Date.UTC(2026, 9, 3, 12);
  const logs: LogEvent[] = [];
  const cfg = config(env);
  const handler = createResolveHandler({
    client: createQlooClient(cfg),
    limiter: createRateLimiter(cfg.limits.resolve, () => now),
    clientKey: createClientKey({ now: () => now, secret: "test" }),
    log: (event) => void logs.push(event),
    now: () => now,
    newId: () => "req-1",
    ...overrides,
  });
  return { handler, logs, advance: (ms: number) => void (now += ms) };
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/resolve", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const entity = (query: string, extra: object = {}) => ({ kind: "entity", query, ...extra });

describe("POST /api/resolve: answers", () => {
  it("confirms a confident Seed with one candidate", async () => {
    const res = await setup().handler(post(entity("Patsy Cline")));
    const body = (await res.json()) as { status: string; data: Array<{ entityId: string; name: string }> };

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ entityId: "fx-artist-patsy-cline", name: "Patsy Cline" });
  });

  it("answers needs_input with several candidates for an ambiguous Seed (EVALS (a))", async () => {
    const res = await setup().handler(post(entity("Doris Day")));
    const body = (await res.json()) as { status: string; data: unknown[] };

    expect(body.status).toBe("needs_input");
    expect(body.data.length).toBeGreaterThanOrEqual(2);
  });

  it("answers empty, with the fixture hint, for an unknown name", async () => {
    const res = await setup().handler(post(entity("Pattsy Klein")));
    const body = (await res.json()) as { status: string; data: unknown[]; hint: string };

    expect(body).toMatchObject({ status: "empty", data: [], hint: "Fixture mode: try the demo Seeds (P1-P5)" });
  });

  it("resolves a topic to a tag", async () => {
    const res = await setup().handler(post({ kind: "tag", query: "war films" }));
    const body = (await res.json()) as { status: string; data: Array<{ id: string; name: string }> };

    expect(body.status).toBe("ok");
    expect(body.data).toEqual([{ id: "fx-tag-war-films", name: "War films" }]);
  });

  it("limits the search to one domain when asked", async () => {
    const res = await setup().handler(post(entity("Pillow Talk", { domain: "music" })));

    expect(((await res.json()) as { status: string }).status).toBe("empty");
  });

  it("does not hand back provenance, which can hold query text", async () => {
    const res = await setup().handler(post(entity("Patsy Cline")));

    expect(Object.keys((await res.json()) as object).sort()).toEqual(["data", "status"]);
  });

  it("passes a Qloo failure on as an error envelope the page can word kindly", async () => {
    const failing: QlooClient = {
      ...createQlooClient(config()),
      search: async () => ({
        status: "error",
        data: null,
        provenance: { endpoint: "/search", paramsKey: "", cached: false, stale: false, retries: 3, ms: 8000 },
        errorCode: "timeout",
      }),
    };

    const res = await setup({}, { client: failing }).handler(post(entity("Patsy Cline")));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "error", data: null, errorCode: "timeout" });
  });
});

describe("POST /api/resolve: 400 and 413 stay generic (SC-12, NFR-14)", () => {
  it.each([
    ["not JSON", "{nope"],
    ["an empty body", ""],
    ["a missing query", { kind: "entity" }],
    ["a one-letter query", entity("x")],
    ["a blank query", entity("   ")],
    ["a query over 80 characters", entity("x".repeat(81))],
    ["a topic over 60 characters", { kind: "tag", query: "y".repeat(61) }],
    ["an unknown kind", { kind: "artist", query: "Patsy Cline" }],
    ["an unknown domain", entity("Patsy Cline", { domain: "podcast" })],
    ["an unknown key", entity("Patsy Cline", { firstName: "Margaret" })],
    ["an array", [entity("Patsy Cline")]],
  ])("answers 400 to %s, without echoing it", async (_label, body) => {
    const res = await setup().handler(post(body));
    const text = await res.text();

    expect(res.status).toBe(400);
    expect(JSON.parse(text)).toEqual({ error: "invalid_request", message: "The request was not valid." });
  });

  it("answers 400 to a request that is not JSON", async () => {
    const res = await setup().handler(post(entity("Patsy Cline"), { "content-type": "text/plain" }));

    expect(res.status).toBe(400);
  });

  it("answers 413 to an oversized body, declared or streamed", async () => {
    const big = { ...entity("Patsy Cline"), pad: "x".repeat(5_000) };

    expect((await setup().handler(post(big))).status).toBe(413);
    const streamed = new Request("http://localhost/api/resolve", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify(big)));
          controller.close();
        },
      }),
      duplex: "half",
    } as RequestInit);
    expect((await setup().handler(streamed)).status).toBe(413);
  });
});

describe("POST /api/resolve: rate limit (NFR-15)", () => {
  it("answers 429 with Retry-After once a caller has used the bucket", async () => {
    const { handler } = setup({ RL_RESOLVE: "2/1" });

    expect((await handler(post(entity("Patsy Cline")))).status).toBe(200);
    expect((await handler(post(entity("Patsy Cline")))).status).toBe(200);
    const blocked = await handler(post(entity("Patsy Cline")));

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("30");
    expect(await blocked.json()).toEqual({
      error: "rate_limited",
      message: "That was a lot of searches at once. Wait a moment, then try again.",
    });
  });

  it("limits each address on its own, by the first x-forwarded-for entry", async () => {
    const { handler } = setup({ RL_RESOLVE: "1/1" });

    expect((await handler(post(entity("Patsy Cline")))).status).toBe(200);
    expect((await handler(post(entity("Patsy Cline")))).status).toBe(429);
    expect((await handler(post(entity("Patsy Cline"), { "x-forwarded-for": "198.51.100.9" }))).status).toBe(200);
    expect((await handler(post(entity("Patsy Cline"), { "x-forwarded-for": "203.0.113.7, 198.51.100.9" }))).status).toBe(429);
  });

  it("lets the caller back in after the wait", async () => {
    const { handler, advance } = setup({ RL_RESOLVE: "1/1" });
    await handler(post(entity("Patsy Cline")));
    expect((await handler(post(entity("Patsy Cline")))).status).toBe(429);

    advance(60_000);

    expect((await handler(post(entity("Patsy Cline")))).status).toBe(200);
  });

  it("counts a malformed request too, so junk cannot be sent for free", async () => {
    const { handler } = setup({ RL_RESOLVE: "1/1" });

    expect((await handler(post("{nope"))).status).toBe(400);
    expect((await handler(post(entity("Patsy Cline")))).status).toBe(429);
  });

  it("uses the config's default of 60 a minute when nothing overrides it", () => {
    expect(config().limits.resolve).toEqual({ capacity: 60, perMinutes: 1 });
  });

  it("is switched off by RATE_LIMIT_MODE=off in the E2E server", async () => {
    const cfg = config({ RATE_LIMIT_MODE: "off", RL_RESOLVE: "1/1" });
    const { handler } = setup({}, { limiter: cfg.rateLimitMode === "off" ? () => ({ ok: true, retryAfterSec: 0 }) : () => ({ ok: false, retryAfterSec: 1 }) });

    expect((await handler(post(entity("Patsy Cline")))).status).toBe(200);
    expect((await handler(post(entity("Patsy Cline")))).status).toBe(200);
  });
});

describe("POST /api/resolve: logging (PLAN 9)", () => {
  it("writes one line per request with the route, status, timing and an id", async () => {
    const { handler, logs } = setup();

    await handler(post(entity("Patsy Cline")));

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ event: "request", route: "resolve", status: 200, reqId: "req-1", ms: 0 });
  });

  it("never logs a body, a typed name or an address, whatever the outcome", async () => {
    const { handler, logs } = setup({ RL_RESOLVE: "2/1" });

    await handler(post(entity("Patsy Cline")));
    await handler(post(entity("Margaret"))); // a first name typed by mistake
    await handler(post({ kind: "entity", query: "Patsy Cline", extra: 1 }));

    const text = JSON.stringify(logs);
    expect(logs).toHaveLength(3);
    expect(text).not.toMatch(/patsy|cline|margaret/i);
    expect(text).not.toContain("203.0.113.7");
    expect(logs.map((l) => l.status)).toEqual([200, 200, 429]);
  });

  it("sends the request id back so a Caregiver can quote it", async () => {
    const res = await setup().handler(post(entity("Patsy Cline")));

    expect(res.headers.get("x-request-id")).toBe("req-1");
  });
});

describe("POST /api/resolve: our own bugs", () => {
  it("answers 500 with a generic message, and logs only the error's name", async () => {
    const broken: QlooClient = {
      ...createQlooClient(config()),
      search: vi.fn(async () => {
        throw new TypeError("secret detail Patsy Cline");
      }),
    };
    const { handler, logs } = setup({}, { client: broken });

    const res = await handler(post(entity("Patsy Cline")));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal_error", message: "We couldn't look that up this time." });
    expect(JSON.stringify(logs)).not.toMatch(/secret|patsy/i);
    expect(logs.at(-1)).toMatchObject({ route: "resolve", status: 500, error: "TypeError" });
  });
});
