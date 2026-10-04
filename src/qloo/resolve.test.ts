import { describe, expect, it, vi } from "vitest";
import { resolveSeed, resolveTag } from "@/qloo/resolve";
import { DOMAIN_URN, type Envelope, type QlooClient, type QlooEntity, type QlooTag } from "@/qloo/types";

const PROVENANCE = {
  endpoint: "/search",
  paramsKey: "",
  cached: false,
  stale: false,
  retries: 0,
  ms: 0,
} as const;

const entity = (name: string, over: Partial<QlooEntity> = {}): QlooEntity => ({
  entityId: `id-${name.toLowerCase().replace(/\W+/g, "-")}`,
  name,
  type: "urn:entity:artist",
  domain: "music",
  imageUrl: null,
  tags: [{ id: "t-country", name: "Country" }],
  affinity: 0.9,
  explainability: { "some-seed": 0.5 },
  ...over,
});

const found = (entities: readonly QlooEntity[]): Envelope<readonly QlooEntity[]> => ({
  status: entities.length === 0 ? "empty" : "ok",
  data: entities,
  provenance: PROVENANCE,
});

/** A client whose `search` and `tags` answers are scripted; the call arguments are recorded. */
function clientReturning(
  search: Envelope<readonly QlooEntity[]>,
  tags: Envelope<readonly QlooTag[]> = { status: "empty", data: [], provenance: PROVENANCE },
) {
  const searchSpy = vi.fn(async () => search);
  const tagsSpy = vi.fn(async () => tags);
  const client: QlooClient = {
    search: searchSpy,
    tags: tagsSpy,
    insights: async () => ({ status: "empty", data: { entities: [] }, provenance: PROVENANCE }),
  };
  return { client, searchSpy, tagsSpy };
}

describe("resolveSeed: a confident match (FR-4)", () => {
  it("answers ok with just the top match when it is near-exact and the runner-up is far", async () => {
    const { client } = clientReturning(found([entity("Patsy Cline"), entity("Loretta Lynn")]));

    const result = await resolveSeed(client, { query: "patsy cline" });

    expect(result.status).toBe("ok");
    expect(result.data?.map((c) => c.name)).toEqual(["Patsy Cline"]);
  });

  it("picks the best name match even when Qloo lists it second", async () => {
    const { client } = clientReturning(found([entity("Patsy"), entity("Patsy Cline")]));

    const result = await resolveSeed(client, { query: "Patsy Cline" });

    expect(result.status).toBe("ok");
    expect(result.data?.[0]?.name).toBe("Patsy Cline");
  });

  it("returns only what the Caregiver needs to confirm, not Qloo's tags or scores", async () => {
    const { client } = clientReturning(
      found([entity("Patsy Cline", { year: 1932, description: "American singer", imageUrl: "https://img.example/a.jpg" })]),
    );

    const result = await resolveSeed(client, { query: "Patsy Cline" });

    expect(result.data).toEqual([
      {
        entityId: "id-patsy-cline",
        name: "Patsy Cline",
        domain: "music",
        year: 1932,
        description: "American singer",
        imageUrl: "https://img.example/a.jpg",
      },
    ]);
  });
});

describe("resolveSeed: never auto-picks (FR-4)", () => {
  it("answers needs_input when two entities carry the same name (EVALS (a): Doris Day)", async () => {
    const singer = entity("Doris Day", { entityId: "a", description: "Singer" });
    const tribute = entity("Doris Day", { entityId: "b", description: "Tribute act" });
    const { client } = clientReturning(found([singer, tribute]));

    const result = await resolveSeed(client, { query: "Doris Day" });

    expect(result.status).toBe("needs_input");
    expect(result.data?.map((c) => c.entityId)).toEqual(["a", "b"]);
  });

  it("answers needs_input when the runner-up is 0.80 or closer, even if the top is exact", async () => {
    const { client } = clientReturning(found([entity("Patsy Cline"), entity("Patsy Clines")]));

    expect((await resolveSeed(client, { query: "Patsy Cline" })).status).toBe("needs_input");
  });

  it("answers needs_input when the top match is below 0.92, even with no runner-up", async () => {
    const { client } = clientReturning(found([entity("Patsy Cline")]));

    const result = await resolveSeed(client, { query: "Pattsy Cline" });

    expect(result.status).toBe("needs_input");
    expect(result.data).toHaveLength(1);
  });

  it("keeps at most five candidates, best name match first", async () => {
    const names = ["Doris", "Doris Day", "Day Doris Day", "Doris D", "The Doris Day Show", "Doris Daye", "Doris Dey"];
    const { client } = clientReturning(found(names.map((name) => entity(name))));

    const result = await resolveSeed(client, { query: "Doris Day" });

    expect(result.status).toBe("needs_input");
    expect(result.data).toHaveLength(5);
    expect(result.data?.[0]?.name).toBe("Doris Day");
  });

  it("lists an entity once, whatever Qloo repeats", async () => {
    const twice = entity("Patsy Cline");
    const { client } = clientReturning(found([twice, twice]));

    const result = await resolveSeed(client, { query: "Patsy Cline" });

    expect(result.status).toBe("ok");
    expect(result.data).toHaveLength(1);
  });
});

describe("resolveSeed: nothing, and trouble", () => {
  it("passes an empty search through with Qloo's hint", async () => {
    const { client } = clientReturning({ ...found([]), hint: "Fixture mode: try the demo Seeds (P1-P5)" });

    const result = await resolveSeed(client, { query: "Pattsy Klein" });

    expect(result.status).toBe("empty");
    expect(result.data).toEqual([]);
    expect(result.hint).toBe("Fixture mode: try the demo Seeds (P1-P5)");
  });

  it("answers empty when every hit is in a domain the Caregiver did not ask for", async () => {
    const { client } = clientReturning(found([entity("Pillow Talk", { type: "urn:entity:movie", domain: "film" })]));

    const result = await resolveSeed(client, { query: "Pillow Talk", domain: "music" });

    expect(result.status).toBe("empty");
  });

  it("passes a failure through with its code and no data", async () => {
    const { client } = clientReturning({ status: "error", data: null, provenance: PROVENANCE, errorCode: "timeout" });

    const result = await resolveSeed(client, { query: "Patsy Cline" });

    expect(result.status).toBe("error");
    expect(result.errorCode).toBe("timeout");
    expect(result.data).toBeNull();
  });
});

describe("resolveSeed: what is sent to Qloo", () => {
  it("searches every Cue type when no domain is given", async () => {
    const { client, searchSpy } = clientReturning(found([]));

    await resolveSeed(client, { query: "  Patsy Cline " });

    expect(searchSpy).toHaveBeenCalledWith({ query: "Patsy Cline", types: Object.values(DOMAIN_URN), take: 10 }, undefined);
  });

  it("searches just the one type when a domain is given", async () => {
    const { client, searchSpy } = clientReturning(found([]));

    await resolveSeed(client, { query: "Pillow Talk", domain: "film" });

    expect(searchSpy).toHaveBeenCalledWith({ query: "Pillow Talk", types: ["urn:entity:movie"], take: 10 }, undefined);
  });

  it("cuts a query to the 80 characters PLAN 5.4 allows", async () => {
    const { client, searchSpy } = clientReturning(found([]));

    await resolveSeed(client, { query: "x".repeat(200) });

    const sent = (searchSpy.mock.calls[0] as unknown as [{ query: string }])[0].query;
    expect(sent).toHaveLength(80);
  });
});

describe("resolveTag (FR-5)", () => {
  const tag = (name: string): QlooTag => ({ id: `tag-${name.toLowerCase().replace(/\W+/g, "-")}`, name });
  const tagsFound = (tags: readonly QlooTag[]): Envelope<readonly QlooTag[]> => ({
    status: tags.length === 0 ? "empty" : "ok",
    data: tags,
    provenance: { ...PROVENANCE, endpoint: "/v2/tags" },
  });

  it("matches a topic to a tag only when the names are near-exact", async () => {
    const { client } = clientReturning(found([]), tagsFound([tag("War films"), tag("Documentary")]));

    const result = await resolveTag(client, { query: "war films" });

    expect(result.status).toBe("ok");
    expect(result.data).toEqual([{ id: "tag-war-films", name: "War films" }]);
  });

  it("offers a loose match as needs_input rather than adopting it", async () => {
    const { client } = clientReturning(found([]), tagsFound([tag("War films")]));

    const result = await resolveTag(client, { query: "Vietnam War" });

    expect(result.status).toBe("needs_input");
  });

  it("passes empty and error envelopes through, and cuts the topic to 60 characters", async () => {
    const empty = clientReturning(found([]), tagsFound([]));
    expect((await resolveTag(empty.client, { query: "x".repeat(100) })).status).toBe("empty");
    expect((empty.tagsSpy.mock.calls[0] as unknown as [{ query: string }])[0].query).toHaveLength(60);

    const failing = clientReturning(found([]), { status: "error", data: null, provenance: PROVENANCE, errorCode: "upstream" });
    expect((await resolveTag(failing.client, { query: "hospitals" })).errorCode).toBe("upstream");
  });
});
