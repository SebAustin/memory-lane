import { describe, expect, it, vi } from "vitest";
import { createFetchResolver } from "./resolver";

const candidate = (name: string, id = `id-${name}`) => ({
  entityId: id,
  name,
  domain: "music",
  imageUrl: null,
});

/** A fetch that answers with `body` (or the given Response) and records what it was sent. */
function fetchAnswering(answer: unknown, init: ResponseInit = { status: 200 }) {
  const spy = vi.fn<typeof fetch>(async () => (answer instanceof Response ? answer : Response.json(answer, init)));
  return { fetchImpl: spy, spy };
}

const sentBody = (spy: ReturnType<typeof fetchAnswering>["spy"]) =>
  JSON.parse(String(spy.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;

describe("resolver.entity: what is sent (ADR 0001, EVALS (i))", () => {
  it("posts to /api/resolve with the first name already removed", async () => {
    const { fetchImpl, spy } = fetchAnswering({ status: "empty", data: [] });

    await createFetchResolver(fetchImpl).entity("Margaret's favorite Patsy Cline", { firstName: "Margaret" });

    expect(spy.mock.calls[0]?.[0]).toBe("/api/resolve");
    expect(sentBody(spy)).toEqual({ kind: "entity", query: "favorite Patsy Cline" });
    expect(JSON.stringify(sentBody(spy)).toLowerCase()).not.toContain("margaret");
  });

  it("cuts the text to the 80 characters the server accepts", async () => {
    const { fetchImpl, spy } = fetchAnswering({ status: "empty", data: [] });

    await createFetchResolver(fetchImpl).entity("x".repeat(200), { firstName: "" });

    expect(String(sentBody(spy).query)).toHaveLength(80);
  });

  it("does not call the server when nothing is left after the name is removed", async () => {
    const { fetchImpl, spy } = fetchAnswering({});

    const outcome = await createFetchResolver(fetchImpl).entity("Margaret", { firstName: "Margaret" });

    expect(outcome).toEqual({ kind: "invalid" });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("resolver.entity: what comes back", () => {
  it("a confident match is one candidate to confirm", async () => {
    const { fetchImpl } = fetchAnswering({ status: "ok", data: [candidate("Patsy Cline")] });

    const outcome = await createFetchResolver(fetchImpl).entity("Patsy Cline", { firstName: "" });

    expect(outcome).toEqual({ kind: "match", candidate: candidate("Patsy Cline") });
  });

  it("needs_input is a choice, even when only one candidate comes back", async () => {
    const { fetchImpl } = fetchAnswering({ status: "needs_input", data: [candidate("Patsy Cline")] });

    const outcome = await createFetchResolver(fetchImpl).entity("Pattsy", { firstName: "" });

    expect(outcome).toEqual({ kind: "choose", candidates: [candidate("Patsy Cline")] });
  });

  it("never auto-picks: a degraded answer with several candidates is a choice too", async () => {
    const { fetchImpl } = fetchAnswering({ status: "degraded", data: [candidate("AB"), candidate("AC")] });

    expect((await createFetchResolver(fetchImpl).entity("AB", { firstName: "" })).kind).toBe("choose");
  });

  it("empty carries the server's hint", async () => {
    const { fetchImpl } = fetchAnswering({ status: "empty", data: [], hint: "Fixture mode: try the demo Seeds (P1-P5)" });

    const outcome = await createFetchResolver(fetchImpl).entity("Pattsy Klein", { firstName: "" });

    expect(outcome).toEqual({ kind: "none", hint: "Fixture mode: try the demo Seeds (P1-P5)" });
  });

  it("an error envelope means Qloo is unreachable", async () => {
    const { fetchImpl } = fetchAnswering({ status: "error", data: null, errorCode: "timeout" });

    expect(await createFetchResolver(fetchImpl).entity("Patsy Cline", { firstName: "" })).toEqual({ kind: "unreachable" });
  });

  it.each([
    ["a server error", () => Response.json({ error: "internal_error" }, { status: 500 })],
    ["a body that is not the contract", () => Response.json({ hello: "world" })],
    ["a body that is not JSON", () => new Response("<html>", { status: 200 })],
  ])("treats %s as unreachable, never as an empty search", async (_label, make) => {
    const { fetchImpl } = fetchAnswering(make());

    expect(await createFetchResolver(fetchImpl).entity("Patsy Cline", { firstName: "" })).toEqual({ kind: "unreachable" });
  });

  it("treats a network failure as unreachable", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    expect(await createFetchResolver(fetchImpl).entity("Patsy Cline", { firstName: "" })).toEqual({ kind: "unreachable" });
  });

  it("reads Retry-After from a 429", async () => {
    const { fetchImpl } = fetchAnswering(
      new Response("{}", { status: 429, headers: { "Retry-After": "42" } }),
    );

    expect(await createFetchResolver(fetchImpl).entity("Patsy Cline", { firstName: "" })).toEqual({
      kind: "busy",
      retryAfterSec: 42,
    });
  });

  it("falls back to 30 seconds when a 429 has no usable Retry-After", async () => {
    const { fetchImpl } = fetchAnswering(new Response("{}", { status: 429 }));

    expect(await createFetchResolver(fetchImpl).entity("Patsy Cline", { firstName: "" })).toEqual({
      kind: "busy",
      retryAfterSec: 30,
    });
  });
});

describe("resolver.tag (FR-5)", () => {
  it("sends a topic as kind tag, name removed", async () => {
    const { fetchImpl, spy } = fetchAnswering({ status: "empty", data: [] });

    await createFetchResolver(fetchImpl).tag("Margaret's late husband", { firstName: "Margaret" });

    expect(sentBody(spy)).toEqual({ kind: "tag", query: "late husband" });
  });

  it("a matched tag is returned", async () => {
    const { fetchImpl } = fetchAnswering({ status: "ok", data: [{ id: "fx-tag-war-films", name: "War films" }] });

    expect(await createFetchResolver(fetchImpl).tag("war films", { firstName: "" })).toEqual({
      kind: "tag",
      tag: { id: "fx-tag-war-films", name: "War films" },
    });
  });

  it("anything less than a confident match leaves the topic as Prompt guidance only", async () => {
    const loose = fetchAnswering({ status: "needs_input", data: [{ id: "t", name: "War films" }] });
    const none = fetchAnswering({ status: "empty", data: [] });

    expect(await createFetchResolver(loose.fetchImpl).tag("Vietnam War", { firstName: "" })).toEqual({
      kind: "topic",
      reachedQloo: true,
    });
    expect(await createFetchResolver(none.fetchImpl).tag("hospitals", { firstName: "" })).toEqual({
      kind: "topic",
      reachedQloo: true,
    });
  });

  it("says so when Qloo could not be reached, and still keeps the topic", async () => {
    const down = fetchAnswering({ status: "error", data: null });
    const rejected = (async () => {
      throw new TypeError("offline");
    }) as unknown as typeof fetch;

    expect(await createFetchResolver(down.fetchImpl).tag("hospitals", { firstName: "" })).toEqual({
      kind: "topic",
      reachedQloo: false,
    });
    expect(await createFetchResolver(rejected).tag("hospitals", { firstName: "" })).toEqual({
      kind: "topic",
      reachedQloo: false,
    });
  });
});
