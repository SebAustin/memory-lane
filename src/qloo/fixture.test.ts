import { describe, expect, it } from "vitest";
import { FixtureQlooClient, loadFixtureIndex } from "@/qloo/fixture";
import { bundledFixtureIndex } from "@/qloo/fixtures";
import { createQlooClient } from "@/qloo";
import { getServerConfig } from "@/server/config";
import type { InsightsParams } from "@/qloo/types";

const artist = (slug: string, affinity: number, tags: string[] = []) => ({
  entity_id: `fx-artist-${slug}`,
  name: slug.toUpperCase(),
  type: "urn:entity:artist",
  tags: tags.map((id) => ({ tag_id: id, name: id })),
  query: { affinity },
});

const FILES = {
  "music.json": {
    results: {
      entities: [
        artist("low", 0.2),
        artist("high", 0.9, ["t-war"]),
        artist("mid", 0.5, ["t-country"]),
        { not: "an entity" },
      ],
    },
  },
  "film.json": { results: { entities: [{ ...artist("film", 0.5), type: "urn:entity:movie" }] } },
};

const INDEX = {
  version: 1,
  insights: [
    { type: "urn:entity:artist", location: "Memphis", file: "music.json" },
    { type: "urn:entity:movie", window: { min: 1956, max: 1976 }, file: "film.json" },
  ],
};

const client = () =>
  new FixtureQlooClient({ index: loadFixtureIndex(INDEX, FILES), imageHosts: [] });

const music = (extra: Partial<InsightsParams> = {}): InsightsParams => ({
  filterType: "urn:entity:artist",
  locationQuery: "Memphis",
  ...extra,
});

describe("FixtureQlooClient.insights", () => {
  it("serves matching entities best affinity first and drops malformed ones", async () => {
    const env = await client().insights(music());

    expect(env.status).toBe("ok");
    expect(env.data?.entities.map((e) => e.entityId)).toEqual([
      "fx-artist-high",
      "fx-artist-mid",
      "fx-artist-low",
    ]);
  });

  it("labels the result as fixture data in its provenance", async () => {
    const { provenance } = await client().insights(music());

    expect(provenance).toMatchObject({
      endpoint: "/v2/insights",
      cached: false,
      stale: false,
      retries: 0,
      synthetic: true,
    });
  });

  it("respects take", async () => {
    const env = await client().insights(music({ take: 2 }));
    expect(env.data?.entities).toHaveLength(2);
  });

  it("matches the location case-insensitively and ignoring surrounding spaces", async () => {
    const env = await client().insights(music({ locationQuery: "  memphis " }));
    expect(env.status).toBe("ok");
  });

  it("ignores interests, so a changed Taste Profile still hits the fixture (R3)", async () => {
    const a = await client().insights(music({ interests: ["x"] }));
    const b = await client().insights(music({ interests: ["y", "z"], age: "55_and_older" }));
    expect(b.data?.entities).toEqual(a.data?.entities);
  });

  it("applies excluded entities and excluded tags itself", async () => {
    const env = await client().insights(
      music({ excludeEntities: ["fx-artist-mid"], excludeTags: ["t-war"] }),
    );
    expect(env.data?.entities.map((e) => e.entityId)).toEqual(["fx-artist-low"]);
  });

  it("matches the release-year window for film and ignores location there", async () => {
    const hit = await client().insights({
      filterType: "urn:entity:movie",
      releaseYear: { min: 1956, max: 1976 },
    });
    const miss = await client().insights({
      filterType: "urn:entity:movie",
      releaseYear: { min: 1953, max: 1979 },
    });

    expect(hit.data?.entities.map((e) => e.domain)).toEqual(["film"]);
    expect(miss.status).toBe("empty");
  });

  it("returns empty with a hint, never an error, for a request with no fixture", async () => {
    const env = await client().insights(music({ locationQuery: "Atlantis" }));

    expect(env.status).toBe("empty");
    expect(env.data).toEqual({ entities: [] });
    expect(env.hint).toMatch(/fixture/i);
    expect(env.provenance.synthetic).toBe(true);
  });

  it("returns empty when every entity is excluded", async () => {
    const env = await client().insights(
      music({ excludeEntities: ["fx-artist-low", "fx-artist-mid", "fx-artist-high"] }),
    );
    expect(env.status).toBe("empty");
  });

  it("builds a paramsKey that is stable and free of free text", async () => {
    const a = await client().insights(music({ interests: ["b", "a"], take: 5 }));
    const b = await client().insights(music({ take: 5, interests: ["b", "a"] }));

    expect(a.provenance.paramsKey).toBe(b.provenance.paramsKey);
    expect(a.provenance.paramsKey).toContain("urn:entity:artist");
  });

  it("scrubs images that are not on the allow-list, using its own host list", async () => {
    const files = {
      "m.json": {
        results: {
          entities: [
            { ...artist("a", 0.9), properties: { image: "https://ok.example/a.jpg" } },
            { ...artist("b", 0.8), properties: { image: { url: "https://bad.example/b.jpg" } } },
          ],
        },
      },
    };
    const index = loadFixtureIndex(
      { version: 1, insights: [{ type: "urn:entity:artist", file: "m.json" }] },
      files,
    );
    const env = await new FixtureQlooClient({ index, imageHosts: ["ok.example"] }).insights({
      filterType: "urn:entity:artist",
    });

    expect(env.data?.entities.map((e) => e.imageUrl)).toEqual(["https://ok.example/a.jpg", null]);
  });
});

describe("loadFixtureIndex", () => {
  it("rejects an index that does not match the schema", () => {
    expect(() => loadFixtureIndex({ version: 2, insights: [] }, {})).toThrow(/fixture index/i);
    expect(() =>
      loadFixtureIndex({ version: 1, insights: [{ type: "urn:entity:podcast", file: "x" }] }, {}),
    ).toThrow(/fixture index/i);
  });

  it("rejects an entry whose file is missing or is not a Qloo insights response", () => {
    const index = { version: 1, insights: [{ type: "urn:entity:artist", file: "gone.json" }] };
    expect(() => loadFixtureIndex(index, {})).toThrow(/gone\.json/);
    expect(() => loadFixtureIndex(index, { "gone.json": { results: {} } })).toThrow(/gone\.json/);
  });
});

describe("bundled P1 music fixtures", () => {
  const bundled = () => new FixtureQlooClient({ index: bundledFixtureIndex, imageHosts: [] });
  const memphis: InsightsParams = {
    filterType: "urn:entity:artist",
    locationQuery: "Memphis",
    age: "55_and_older",
    take: 15,
  };

  it("serves at least 15 fx- artists for Memphis, all valid", async () => {
    const env = await bundled().insights({ ...memphis, take: 50 });

    const entities = env.data?.entities ?? [];
    expect(entities.length).toBeGreaterThanOrEqual(15);
    for (const entity of entities) {
      expect(entity.entityId.startsWith("fx-")).toBe(true);
      expect(entity.domain).toBe("music");
    }
    expect(new Set(entities.map((e) => e.entityId)).size).toBe(entities.length);
  });

  it("leaves out Patti Page: Margaret's Avoid List holds her signature song", async () => {
    const env = await bundled().insights({ ...memphis, take: 50 });
    const names = env.data?.entities.map((e) => e.name) ?? [];
    expect(names).not.toContain("Patti Page");
  });

  it("never exposes an image: no host is allow-listed yet, so cards show monograms", async () => {
    const env = await bundled().insights({ ...memphis, take: 50 });
    expect(env.data?.entities.every((e) => e.imageUrl === null)).toBe(true);
  });
});

describe("createQlooClient", () => {
  it("returns the fixture client in fixture mode", async () => {
    const cfg = getServerConfig({ QLOO_MODE: "fixture" });
    const env = await createQlooClient(cfg).insights({
      filterType: "urn:entity:artist",
      locationQuery: "Memphis",
      take: 3,
    });
    expect(env.status).toBe("ok");
    expect(env.data?.entities).toHaveLength(3);
  });

  it("refuses live mode until the HTTP client lands (ticket 05)", () => {
    const cfg = getServerConfig({ QLOO_MODE: "live", QLOO_API_KEY: "test-key" });
    expect(() => createQlooClient(cfg)).toThrow(/live/i);
  });
});
