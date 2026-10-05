import { describe, expect, it } from "vitest";
import { createCallBudget } from "@/qloo/budget";
import { parseFaults } from "@/qloo/faults";
import { FixtureQlooClient, loadFixtureIndex } from "@/qloo/fixture";
import { syntheticScore } from "@/qloo/fnv";
import type { InsightsParams } from "@/qloo/types";

/** A tiny, fully known fixture set: every expected value below is read straight off it. */
const entity = (id: string, affinity: number, type: string, tags: string[] = [], year?: number) => ({
  entity_id: id,
  name: id.toUpperCase(),
  type,
  properties: year === undefined ? {} : { release_year: year },
  tags: tags.map((tag) => ({ tag_id: tag, name: tag })),
  query: { affinity },
});
const movie = (id: string, affinity: number, tags: string[] = [], year = 1960) =>
  entity(id, affinity, "urn:entity:movie", tags, year);

const FILES = {
  "film.json": {
    results: {
      entities: [
        movie("m1", 0.9, ["t-romance"]),
        movie("m2", 0.8, ["t-war"]),
        movie("m3", 0.7, ["t-western"]),
        movie("m4", 0.6, ["t-romance", "t-western"]),
        movie("m5", 0.5, []),
      ],
    },
  },
  "music.json": { results: { entities: [entity("a1", 0.9, "urn:entity:artist", ["t-country"])] } },
  "empty-book.json": { results: { entities: [] } },
  "brand-a.json": { results: { entities: [entity("b-a", 0.9, "urn:entity:brand", ["t-shared", "t-a"])] } },
  "brand-b.json": { results: { entities: [entity("b-b", 0.9, "urn:entity:brand", ["t-shared", "t-b"])] } },
  "tags.json": {
    results: {
      tags: [
        { tag_id: "tag-low", name: "Low", query: { affinity: 0.4 } },
        { tag_id: "tag-high", name: "High", query: { affinity: 0.9 } },
      ],
    },
  },
};

const INDEX = {
  version: 1,
  insights: [
    { type: "urn:entity:movie", window: { min: 1956, max: 1976 }, file: "film.json" },
    { type: "urn:entity:artist", location: ["Memphis", "Memphis, TN"], file: "music.json" },
    { type: "urn:entity:book", window: { min: 1956, max: 1976 }, file: "empty-book.json" },
    { type: "urn:entity:brand", seeds: ["seed-a"], file: "brand-a.json" },
    { type: "urn:entity:brand", seeds: ["seed-b"], file: "brand-b.json" },
    { type: "urn:tag", file: "tags.json" },
  ],
};

const make = (options: Partial<ConstructorParameters<typeof FixtureQlooClient>[0]> = {}) =>
  new FixtureQlooClient({ index: loadFixtureIndex(INDEX, FILES), imageHosts: [], ...options });

const film = (extra: Partial<InsightsParams> = {}): InsightsParams => ({
  filterType: "urn:entity:movie",
  releaseYear: { min: 1956, max: 1976 },
  ...extra,
});
const ids = (env: { data: { entities: readonly { entityId: string }[] } | null }) =>
  env.data?.entities.map((e) => e.entityId);

describe("lookup ignores interests and excludes (R3)", () => {
  it("serves the same set whatever the interests, so a changed Taste Profile still hits", async () => {
    const before = await make().insights(film({ interests: ["seed-1"] }));
    const after = await make().insights(film({ interests: ["learned-1", "learned-2"], excludeEntities: ["zzz"] }));
    expect(ids(after)).toEqual(ids(before));
  });

  it("matches on the window, not on a nearby one", async () => {
    const miss = await make().insights(film({ releaseYear: { min: 1953, max: 1979 } }));
    expect(miss.status).toBe("empty");
  });

  it("accepts any listed spelling of the location, ignoring case and spaces", async () => {
    for (const locationQuery of ["Memphis", " memphis, tn "]) {
      const env = await make().insights({ filterType: "urn:entity:artist", locationQuery });
      expect(ids(env)).toEqual(["a1"]);
    }
  });

  it("reads a place's location from filter.location.query too", async () => {
    const env = await make().insights({ filterType: "urn:entity:artist", filterLocationQuery: "Memphis" });
    expect(env.status).toBe("ok");
  });
});

describe("the client applies Exclusions itself", () => {
  it("drops excluded entities and entities carrying an excluded tag", async () => {
    const env = await make().insights(film({ excludeEntities: ["m1"], excludeTags: ["t-war"] }));
    expect(ids(env)).toEqual(["m3", "m4", "m5"]);
  });
});

describe("tag signals (expand_theme, PLAN 14.3)", () => {
  it("returns only entities that carry one of the tags, best first", async () => {
    const env = await make().insights(film({ interestTags: ["t-romance", "t-western"] }));
    expect(ids(env)).toEqual(["m1", "m3", "m4"]);
  });

  it("returns empty, never the unfiltered set, when no entity carries a tag", async () => {
    const env = await make().insights(film({ interestTags: ["t-nowhere"] }));
    expect(env).toMatchObject({ status: "empty", data: { entities: [] } });
    expect(env.hint).toMatch(/tags/i);
  });

  it("still applies the Exclusions to what the tags select", async () => {
    const env = await make().insights(film({ interestTags: ["t-romance"], excludeEntities: ["m1"] }));
    expect(ids(env)).toEqual(["m4"]);
  });

  it("is empty when the only tagged entities are excluded", async () => {
    const env = await make().insights(film({ interestTags: ["t-war"], excludeTags: ["t-war"] }));
    expect(env.status).toBe("empty");
  });
});

describe("re-rank (filter.results.entities)", () => {
  const rerank = (resultEntities: string[], extra: Partial<InsightsParams> = {}): InsightsParams => ({
    filterType: "urn:entity:movie",
    // A different window than any fixture: re-rank looks ids up in every loaded fixture.
    releaseYear: { min: 1900, max: 1999 },
    resultEntities,
    ...extra,
  });

  it("returns exactly the requested ids, found in any loaded fixture", async () => {
    const env = await make().insights(rerank(["m3", "m1", "a1"]));
    expect(new Set(ids(env))).toEqual(new Set(["m3", "m1", "a1"]));
  });

  it("re-scores them deterministically, best first", async () => {
    const first = await make().insights(rerank(["m1", "m2", "m3", "m4", "m5"], { interests: ["seed-1"] }));
    const again = await make().insights(rerank(["m5", "m4", "m3", "m2", "m1"], { interests: ["seed-1"] }));
    expect(ids(again)).toEqual(ids(first));
    const scores = first.data?.entities.map((e) => e.affinity ?? 0) ?? [];
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(scores.some((score) => score !== 0.9 && score !== 0.8)).toBe(true);
  });

  it("leaves unknown ids out, and is empty when none is known", async () => {
    expect(ids(await make().insights(rerank(["m1", "nope"])))).toEqual(["m1"]);
    expect((await make().insights(rerank(["nope"]))).status).toBe("empty");
  });

  it("honours the Exclusions", async () => {
    const env = await make().insights(rerank(["m1", "m2"], { excludeTags: ["t-war"] }));
    expect(ids(env)).toEqual(["m1"]);
  });

  it("never throws in strict mode, since it needs no window match", async () => {
    await expect(make({ strict: true }).insights(rerank(["m1"]))).resolves.toMatchObject({ status: "ok" });
  });
});

describe("explainability is synthetic and deterministic", () => {
  const withSeeds = film({ interests: ["seed-1", "learned-fav"], explainability: true });

  it("scores every requested Seed and Learned Favorite with FNV-1a, in 0.30 to 0.90", async () => {
    const env = await make().insights(withSeeds);
    const first = env.data?.entities[0];
    expect(first?.explainability).toEqual({
      "seed-1": syntheticScore("m1|seed-1"),
      "learned-fav": syntheticScore("m1|learned-fav"),
    });
    for (const e of env.data?.entities ?? []) {
      for (const score of Object.values(e.explainability)) {
        expect(score).toBeGreaterThanOrEqual(0.3);
        expect(score).toBeLessThanOrEqual(0.9);
      }
    }
  });

  it("is the same on every call and every client", async () => {
    const a = await make().insights(withSeeds);
    const b = await make().insights(withSeeds);
    expect(a.data).toEqual(b.data);
  });

  it("is flagged synthetic in the provenance", async () => {
    expect((await make().insights(withSeeds)).provenance.synthetic).toBe(true);
  });

  it("is left out when explainability is not requested", async () => {
    const env = await make().insights(film({ interests: ["seed-1"] }));
    expect(env.data?.entities[0]?.explainability).toEqual({});
  });
});

describe("unknown /search", () => {
  it("returns empty with the demo hint", async () => {
    const env = await make().search({ query: "zzzz qqqq", types: ["urn:entity:movie"] });
    expect(env).toMatchObject({ status: "empty", data: [], hint: "Fixture mode: try the demo Seeds (P1-P5)" });
  });
});

describe("strict mode", () => {
  it("throws only for an unknown (type, window, location) combination", async () => {
    const strict = make({ strict: true });
    await expect(strict.insights(film({ releaseYear: { min: 1, max: 2 } }))).rejects.toThrow(/No fixture/);
    await expect(strict.insights({ filterType: "urn:entity:artist", locationQuery: "Atlantis" })).rejects.toThrow(
      /No fixture/,
    );
  });

  it("answers a covered combination, even when interests are new or everything is excluded or filtered out", async () => {
    const strict = make({ strict: true });
    await expect(strict.insights(film({ interests: ["brand-new"] }))).resolves.toMatchObject({ status: "ok" });
    await expect(strict.insights(film({ interestTags: ["t-nowhere"] }))).resolves.toMatchObject({ status: "empty" });
    await expect(
      strict.insights(film({ excludeEntities: ["m1", "m2", "m3", "m4", "m5"] })),
    ).resolves.toMatchObject({ status: "empty" });
  });

  it("answers an empty fixture as empty, not as a miss", async () => {
    const env = await make({ strict: true }).insights({
      filterType: "urn:entity:book",
      releaseYear: { min: 1956, max: 1976 },
    });
    expect(env).toMatchObject({ status: "empty", data: { entities: [] } });
  });

  it("does not throw on search or tags with no match", async () => {
    await expect(make({ strict: true }).search({ query: "nothing", types: ["urn:entity:movie"] })).resolves.toMatchObject({
      status: "empty",
    });
    await expect(make({ strict: true }).tags({ query: "nothing" })).resolves.toMatchObject({ status: "empty" });
  });
});

describe("files that share one key", () => {
  const brand = (extra: Partial<InsightsParams> = {}): InsightsParams => ({ filterType: "urn:entity:brand", ...extra });

  it("serves the file built for the request's Seeds", async () => {
    expect(ids(await make().insights(brand({ interests: ["seed-b", "x"] })))).toEqual(["b-b"]);
    expect(ids(await make().insights(brand({ interests: ["seed-a"] })))).toEqual(["b-a"]);
  });

  it("never misses because of unknown interests: the first file answers", async () => {
    expect(ids(await make().insights(brand({ interests: ["a-new-learned-favorite"] })))).toEqual(["b-a"]);
  });

  it("prefers the file that carries the requested tags when there are no interests", async () => {
    expect(ids(await make().insights(brand({ interestTags: ["t-shared", "t-b"] })))).toEqual(["b-b"]);
  });
});

describe("fingerprint (urn:tag)", () => {
  it("returns tags, strongest first, and drops excluded tags", async () => {
    const env = await make().insights({ filterType: "urn:tag", interests: ["seed-1"], excludeTags: ["tag-low"], take: 20 });
    expect(env.data?.tags?.map((tag) => tag.id)).toEqual(["tag-high"]);
    const all = await make().insights({ filterType: "urn:tag" });
    expect(all.data?.tags?.map((tag) => tag.id)).toEqual(["tag-high", "tag-low"]);
    expect(all.data?.tags?.[0]?.affinity).toBe(0.9);
    expect(all.data?.entities).toEqual([]);
  });

  it("is empty when every tag is excluded", async () => {
    const env = await make().insights({ filterType: "urn:tag", excludeTags: ["tag-low", "tag-high"] });
    expect(env.status).toBe("empty");
  });
});

describe("take is validated, not passed to slice (L4)", () => {
  it.each([-1, 0, 2.5, Number.NaN, 51])("answers bad_param for take = %s", async (take) => {
    const env = await make().insights(film({ take }));
    expect(env).toMatchObject({ status: "error", data: null, errorCode: "bad_param" });
    expect(env.hint).toMatch(/take/);
  });

  it("accepts 1 to 50, and the slice-1 over-fetch of 25", async () => {
    expect(ids(await make().insights(film({ take: 1 })))).toEqual(["m1"]);
    expect(ids(await make().insights(film({ take: 25 })))).toHaveLength(5);
    expect((await make().insights(film({ take: 50 }))).status).toBe("ok");
  });

  it("validates search and tags take too", async () => {
    expect((await make().search({ query: "x", types: ["urn:entity:movie"], take: 0 })).errorCode).toBe("bad_param");
    expect((await make().tags({ query: "x", take: -3 })).errorCode).toBe("bad_param");
  });
});

describe("the call budget", () => {
  it("answers 'budget' once spent, and honours the agent reserve", async () => {
    const budget = createCallBudget(2, { agent: 1 });
    const client = make();

    expect((await client.insights(film(), { budget })).status).toBe("ok");
    expect(await client.insights(film(), { budget })).toMatchObject({ status: "error", errorCode: "budget" });
    expect((await client.insights(film(), { budget, budgetKind: "agent" })).status).toBe("ok");
    expect((await client.insights(film(), { budget, budgetKind: "agent" })).errorCode).toBe("budget");
  });

  it("applies to search and tags too", async () => {
    const budget = createCallBudget(1, { agent: 0 });
    const client = make();
    await client.search({ query: "a", types: ["urn:entity:movie"] }, { budget });
    expect((await client.tags({ query: "a" }, { budget })).errorCode).toBe("budget");
  });
});

describe("faults (QLOO_FIXTURE_FAULTS, EVALS (c))", () => {
  const faulty = (spec: string, vercelEnv?: string) => make({ faults: parseFaults(spec, vercelEnv) });
  const music: InsightsParams = { filterType: "urn:entity:artist", locationQuery: "Memphis" };

  it("`all` fails every kind of call", async () => {
    const client = faulty("all");
    expect((await client.insights(film())).errorCode).toBe("upstream");
    expect((await client.search({ query: "x", types: ["urn:entity:movie"] })).errorCode).toBe("upstream");
    expect((await client.tags({ query: "x" })).errorCode).toBe("upstream");
    expect((await client.insights({ filterType: "urn:tag" })).errorCode).toBe("upstream");
  });

  it("`book:500` fails books only", async () => {
    const client = faulty("book:500");
    expect((await client.insights({ filterType: "urn:entity:book", releaseYear: { min: 1956, max: 1976 } })).errorCode).toBe("upstream");
    expect((await client.insights(film())).status).toBe("ok");
  });

  it("`music:429x4` outlasts the retries: rate_limited after 3 retries", async () => {
    const env = await faulty("music:429x4").insights(music);
    expect(env).toMatchObject({ status: "error", data: null, errorCode: "rate_limited" });
    expect(env.provenance.retries).toBe(3);
    expect(env.provenance.synthetic).toBe(true);
  });

  it("`music:429x2` is a blip: it recovers, having retried twice", async () => {
    const env = await faulty("music:429x2").insights(music);
    expect(env.status).toBe("ok");
    expect(env.provenance.retries).toBe(2);
  });

  it("does not retry a 403", async () => {
    const env = await faulty("music:403x1").insights(music);
    expect(env).toMatchObject({ status: "error", errorCode: "unsupported_type" });
    expect(env.provenance.retries).toBe(0);
    expect((await faulty("music:403x1").insights(music)).provenance.retries).toBe(0);
  });

  it("reports a timeout", async () => {
    expect((await faulty("music:timeout").insights(music)).errorCode).toBe("timeout");
  });

  it("is ignored when VERCEL_ENV is set", async () => {
    for (const vercelEnv of ["production", "preview", "development"]) {
      expect((await faulty("all", vercelEnv).insights(film())).status).toBe("ok");
    }
  });

  it("still spends the budget, as a failed request would", async () => {
    const budget = createCallBudget(1, { agent: 0 });
    await faulty("music:500").insights(music, { budget });
    expect(budget.remaining("prefetch")).toBe(0);
  });
});
