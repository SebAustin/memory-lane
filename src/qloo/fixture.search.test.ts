import { describe, expect, it } from "vitest";
import { MARGARET } from "@/demo/margaret";
import { createQlooClient } from "@/qloo";
import { loadFixtureIndex } from "@/qloo/fixture";
import { resolveSeed, resolveTag } from "@/qloo/resolve";
import { DOMAIN_URN } from "@/qloo/types";
import { getServerConfig } from "@/config/server-config";

const client = () => createQlooClient(getServerConfig({ QLOO_MODE: "fixture" }));
const ALL_TYPES = Object.values(DOMAIN_URN);

describe("fixture /search (PLAN 3.1, R3)", () => {
  it("resolves every demo Seed of P1-P5 to one confident match", async () => {
    const demoSeeds = [
      "Patsy Cline", "Pillow Talk", "Move Over, Darling",
      "Lonnie Donegan", "Brief Encounter", "Coronation Street",
      "Pedro Infante", "Juan Gabriel", "El Chavo del Ocho",
      "Nora Aunor", "The Carpenters", "Eat Bulaga!",
      "Run-DMC", "Do the Right Thing",
    ];
    for (const query of demoSeeds) {
      const result = await resolveSeed(client(), { query });
      expect(result.status, query).toBe("ok");
      expect(result.data?.[0]?.name, query).toBe(query);
    }
  });

  it("finds Margaret's own Seeds under the same ids her demo story uses", async () => {
    for (const seed of MARGARET.seeds) {
      const result = await resolveSeed(client(), { query: seed.name });
      expect(result.data?.[0]?.entityId, seed.name).toBe(seed.entityId);
    }
  });

  it("returns an ambiguous Doris Day, so the disambiguation chips can be exercised (EVALS (a))", async () => {
    const result = await resolveSeed(client(), { query: "Doris Day" });

    expect(result.status).toBe("needs_input");
    const named = result.data?.filter((candidate) => candidate.name === "Doris Day") ?? [];
    expect(named.length).toBeGreaterThanOrEqual(2);
    expect(new Set(named.map((candidate) => candidate.description)).size).toBe(named.length);
  });

  it("answers empty with the fixture hint for a query it has never heard of (R3)", async () => {
    const envelope = await client().search({ query: "Pattsy Klein", types: ALL_TYPES });

    expect(envelope.status).toBe("empty");
    expect(envelope.data).toEqual([]);
    expect(envelope.hint).toBe("Fixture mode: try the demo Seeds (P1-P5)");
    expect(envelope.provenance.synthetic).toBe(true);
  });

  it("offers a near-miss spelling as a candidate to confirm, never as a pick", async () => {
    const result = await resolveSeed(client(), { query: "Pattsy Cline" });

    expect(result.status).toBe("needs_input");
    expect(result.data?.[0]?.name).toBe("Patsy Cline");
  });

  it("only searches the entity types it is asked for", async () => {
    const envelope = await client().search({ query: "Pillow Talk", types: ["urn:entity:artist"] });

    expect(envelope.status).toBe("empty");
  });

  it("respects take", async () => {
    const envelope = await client().search({ query: "Doris Day", types: ALL_TYPES, take: 1 });

    expect(envelope.data).toHaveLength(1);
  });

  it("keeps the provenance key free of the typed text", async () => {
    const envelope = await client().search({ query: "Patsy Cline", types: ALL_TYPES });

    expect(envelope.provenance.endpoint).toBe("/search");
    expect(envelope.provenance.paramsKey.toLowerCase()).not.toContain("patsy");
  });
});

describe("fixture /v2/tags", () => {
  it("matches an Avoid topic to a tag by name", async () => {
    const result = await resolveTag(client(), { query: "war films" });

    expect(result.status).toBe("ok");
    expect(result.data).toEqual([{ id: "fx-tag-war-films", name: "War films" }]);
  });

  it("finds no tag for an unknown topic, with the fixture hint", async () => {
    const envelope = await client().tags({ query: "Vietnam War" });

    expect(envelope.status).toBe("empty");
    expect(envelope.hint).toBe("Fixture mode: try the demo Seeds (P1-P5)");
  });
});

describe("fixture catalogs: loading", () => {
  it("throws at load time for a search or tags file that is not a Qloo response", () => {
    const base = { version: 1, insights: [] };

    expect(() => loadFixtureIndex({ ...base, search: { file: "s.json" } }, {})).toThrow(/not a Qloo search response/);
    expect(() => loadFixtureIndex({ ...base, tags: { file: "t.json" } }, { "t.json": { nope: 1 } })).toThrow(
      /not a Qloo tags response/,
    );
  });

  it("serves empty answers when an index has no catalogs", async () => {
    const empty = new (await import("@/qloo/fixture")).FixtureQlooClient({
      index: loadFixtureIndex({ version: 1, insights: [] }, {}),
      imageHosts: [],
    });

    expect((await empty.search({ query: "Patsy Cline", types: ALL_TYPES })).status).toBe("empty");
    expect((await empty.tags({ query: "war films" })).status).toBe("empty");
  });

  it("skips malformed tags and entities in a catalog", async () => {
    const index = loadFixtureIndex(
      { version: 1, insights: [], search: { file: "s.json" }, tags: { file: "t.json" } },
      {
        "s.json": { results: [{ nope: true }, { entity_id: "e1", name: "Patsy Cline", type: "urn:entity:artist" }] },
        "t.json": { results: { tags: [{ nope: true }, { tag_id: "t1", name: "War films" }] } },
      },
    );
    const client = new (await import("@/qloo/fixture")).FixtureQlooClient({ index, imageHosts: [] });

    expect((await client.search({ query: "Patsy Cline", types: ALL_TYPES })).data).toHaveLength(1);
    expect((await client.tags({ query: "War films" })).data).toEqual([{ id: "t1", name: "War films" }]);
  });
});
