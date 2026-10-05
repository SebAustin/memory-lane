import { describe, expect, it } from "vitest";
import type { Domain, TasteProfile } from "@/contracts";
import { toSignals } from "@/domain/profile";
import { SENSITIVE_TAG_IDS } from "@/domain/sensitiveTags";
import { AGE_BUCKET, reminiscenceWindow } from "@/domain/window";
import {
  buildInsightsParams,
  validateInsightsParams,
  type BoundContext,
  type CueRequest,
} from "@/qloo/params";
import type { InsightsParams } from "@/qloo/types";

const PROFILE: TasteProfile = {
  version: 0,
  seeds: [
    { entityId: "s-1", name: "Seed One" },
    { entityId: "s-2", name: "Seed Two" },
    { entityId: "s-3", name: "Seed Three" },
  ],
  learnedFavorites: [],
  exclusions: [
    { kind: "entity", id: "x-ent", label: "Excluded", source: "avoid", addedAt: "2026-10-03T00:00:00.000Z" },
    { kind: "tag", id: "x-tag", label: "Excluded tag", source: "avoid", addedAt: "2026-10-03T00:00:00.000Z" },
  ],
  avoidTopics: [],
};

function bound(patch: Partial<BoundContext> = {}, optIn = false): BoundContext {
  return {
    window: reminiscenceWindow(1946),
    widened: [],
    ageBucket: AGE_BUCKET,
    hometown: "Memphis",
    signals: toSignals(PROFILE, optIn),
    stage: "middle",
    previousCueIds: [],
    ...patch,
  };
}

const cues = (domain: Domain, extra: Partial<Extract<CueRequest, { kind: "cues" }>> = {}): CueRequest => ({
  kind: "cues",
  domain,
  ...extra,
});

const EXCLUDES = {
  excludeEntities: ["x-ent"],
  excludeTags: ["x-tag", ...SENSITIVE_TAG_IDS],
  explainability: true,
};
const SEEDS = ["s-1", "s-2", "s-3"];

describe("buildInsightsParams: one request per domain (PLAN 5.1)", () => {
  it("music: artists for the Seeds, the 55+ cohort and the Hometown", () => {
    expect(buildInsightsParams(cues("music"), bound())).toEqual({
      filterType: "urn:entity:artist",
      interests: SEEDS,
      age: "55_and_older",
      locationQuery: "Memphis",
      take: 15,
      ...EXCLUDES,
    });
  });

  it("film: movies in the ORIGINAL Window", () => {
    expect(buildInsightsParams(cues("film"), bound())).toEqual({
      filterType: "urn:entity:movie",
      interests: SEEDS,
      age: "55_and_older",
      releaseYear: { min: 1956, max: 1976 },
      take: 15,
      ...EXCLUDES,
    });
  });

  it("tv: tv shows in the original Window", () => {
    expect(buildInsightsParams(cues("tv"), bound())).toEqual({
      filterType: "urn:entity:tv_show",
      interests: SEEDS,
      age: "55_and_older",
      releaseYear: { min: 1956, max: 1976 },
      take: 15,
      ...EXCLUDES,
    });
  });

  it("book: books in the original Window (release_year on by default, [QLOO-GATED])", () => {
    expect(buildInsightsParams(cues("book"), bound())).toEqual({
      filterType: "urn:entity:book",
      interests: SEEDS,
      age: "55_and_older",
      releaseYear: { min: 1956, max: 1976 },
      take: 15,
      ...EXCLUDES,
    });
  });

  it("book: drops release_year when the gated option says Qloo ignores it", () => {
    const params = buildInsightsParams(cues("book"), bound(), { bookReleaseYear: false });
    expect(params.releaseYear).toBeUndefined();
    expect(params.filterType).toBe("urn:entity:book");
  });

  it("place: the Hometown when there is no Care Location, 10 results, price level at most 3, no Seeds", () => {
    expect(buildInsightsParams(cues("place"), bound())).toEqual({
      filterType: "urn:entity:place",
      filterLocationQuery: "Memphis",
      priceLevelMax: 3,
      take: 10,
      ...EXCLUDES,
    });
  });

  it("place: prefers the Care Location, and carries confirmed cuisine tags as the signal", () => {
    const params = buildInsightsParams(
      cues("place", { cuisineTagIds: ["t-bbq", "t-soul"] }),
      bound({ careLocation: "Germantown" }),
    );
    expect(params.filterLocationQuery).toBe("Germantown");
    expect(params.interestTags).toEqual(["t-bbq", "t-soul"]);
  });

  it("brand: the Seeds and the 55+ cohort, with no window or location", () => {
    expect(buildInsightsParams(cues("brand"), bound())).toEqual({
      filterType: "urn:entity:brand",
      interests: SEEDS,
      age: "55_and_older",
      take: 15,
      ...EXCLUDES,
    });
  });

  it("fingerprint: tags for the Seeds, 20 of them", () => {
    expect(buildInsightsParams({ kind: "fingerprint" }, bound())).toEqual({
      filterType: "urn:tag",
      interests: SEEDS,
      take: 20,
      ...EXCLUDES,
    });
  });

  it("rerank: the domain's own params plus the shortlist", () => {
    const params = buildInsightsParams(
      { kind: "rerank", domain: "film", entityIds: ["a", "b", "c"] },
      bound(),
    );
    expect(params).toEqual({
      ...buildInsightsParams(cues("film"), bound()),
      resultEntities: ["a", "b", "c"],
    });
  });

  it("rerank: at most 20 distinct ids", () => {
    const ids = Array.from({ length: 30 }, (_, i) => `e-${i % 25}`);
    const params = buildInsightsParams({ kind: "rerank", domain: "music", entityIds: ids }, bound());
    expect(params.resultEntities).toHaveLength(20);
    expect(new Set(params.resultEntities).size).toBe(20);
  });
});

describe("buildInsightsParams: expand_theme", () => {
  const expand = (extra: Partial<Extract<CueRequest, { kind: "expand_theme" }>> = {}): CueRequest => ({
    kind: "expand_theme",
    domain: "music",
    tagIds: ["t-country"],
    ...extra,
  });

  it("asks the domain's type by fingerprint TAGS instead of Seeds, and music keeps the Hometown", () => {
    expect(buildInsightsParams(expand(), bound())).toEqual({
      filterType: "urn:entity:artist",
      interestTags: ["t-country"],
      age: "55_and_older",
      locationQuery: "Memphis",
      take: 10,
      ...EXCLUDES,
    });
  });

  it("keeps the domain's window", () => {
    const params = buildInsightsParams(expand({ domain: "tv" }), bound());
    expect(params.releaseYear).toEqual({ min: 1956, max: 1976 });
    expect(params.interests).toBeUndefined();
  });

  it("uses at most 3 distinct tags, and clamps take into 5..10", () => {
    const many = buildInsightsParams(expand({ tagIds: ["a", "b", "a", "c", "d"], take: 50 }), bound());
    expect(many.interestTags).toEqual(["a", "b", "c"]);
    expect(many.take).toBe(10);
    expect(buildInsightsParams(expand({ take: 1 }), bound()).take).toBe(5);
    expect(buildInsightsParams(expand({ take: 7 }), bound()).take).toBe(7);
  });
});

describe("buildInsightsParams: exclusions and sensitive themes (SC-3)", () => {
  const domains = ["music", "film", "tv", "book", "place", "brand"] as const;

  it.each(domains)("%s always carries the Exclusions and explainability", (domain) => {
    const params = buildInsightsParams(cues(domain), bound());
    expect(params.excludeEntities).toEqual(["x-ent"]);
    expect(params.excludeTags).toEqual(["x-tag", ...SENSITIVE_TAG_IDS]);
    expect(params.explainability).toBe(true);
  });

  it("leaves the sensitive-theme tags out of the exclusions only when the Caregiver opted in", () => {
    const params = buildInsightsParams(cues("music"), bound({}, true));
    expect(params.excludeTags).toEqual(["x-tag"]);
  });

  it("keeps Exclusions on the fingerprint, expand_theme and rerank calls too", () => {
    for (const request of [
      { kind: "fingerprint" },
      { kind: "expand_theme", domain: "brand", tagIds: ["t"] },
      { kind: "rerank", domain: "brand", entityIds: ["a"] },
    ] satisfies CueRequest[]) {
      const params = buildInsightsParams(request, bound());
      expect(params.excludeEntities).toEqual(["x-ent"]);
      expect(params.excludeTags).toContain("x-tag");
    }
  });
});

describe("buildInsightsParams: widening applies to film, TV and book only (R2)", () => {
  const widened = bound({ widened: ["book"] });

  it("uses the effective Window for the widened domain", () => {
    expect(buildInsightsParams(cues("book"), widened).releaseYear).toEqual({ min: 1953, max: 1979 });
  });

  it("leaves the other domains on the original Window", () => {
    expect(buildInsightsParams(cues("film"), widened).releaseYear).toEqual({ min: 1956, max: 1976 });
    expect(buildInsightsParams(cues("tv"), widened).releaseYear).toEqual({ min: 1956, max: 1976 });
  });

  it("widens a domain without touching anything else in the request", () => {
    const { releaseYear, ...rest } = buildInsightsParams(cues("tv"), bound({ widened: ["tv"] }));
    const { releaseYear: originalYear, ...originalRest } = buildInsightsParams(cues("tv"), bound());
    expect(releaseYear).toEqual({ min: 1953, max: 1979 });
    expect(originalYear).toEqual({ min: 1956, max: 1976 });
    expect(rest).toEqual(originalRest);
  });

  it("never gives music, place or brand a window", () => {
    const all = bound({ widened: ["film", "tv", "book"] });
    for (const domain of ["music", "place", "brand"] as const) {
      expect(buildInsightsParams(cues(domain), all).releaseYear).toBeUndefined();
    }
  });

  it("applies the widened window to expand_theme and rerank for that domain", () => {
    const expand = buildInsightsParams({ kind: "expand_theme", domain: "book", tagIds: ["t"] }, widened);
    const rerank = buildInsightsParams({ kind: "rerank", domain: "book", entityIds: ["a"] }, widened);
    expect(expand.releaseYear).toEqual({ min: 1953, max: 1979 });
    expect(rerank.releaseYear).toEqual({ min: 1953, max: 1979 });
  });
});

describe("buildInsightsParams: the ladder's two relaxations (PLAN 5.3)", () => {
  it("drops tags without touching the Window or the Exclusions", () => {
    const withTags = buildInsightsParams(cues("place", { cuisineTagIds: ["t-bbq"] }), bound());
    const without = buildInsightsParams(cues("place", { cuisineTagIds: [] }), bound());
    expect(withTags.interestTags).toEqual(["t-bbq"]);
    expect(without.interestTags).toBeUndefined();
    expect(without.excludeTags).toEqual(withTags.excludeTags);
  });

  it("uses only the top 2 Seeds, keeping the Window and Exclusions", () => {
    const top2 = buildInsightsParams(cues("film", { topInterests: 2 }), bound());
    const full = buildInsightsParams(cues("film"), bound());
    expect(top2.interests).toEqual(["s-1", "s-2"]);
    expect(top2.releaseYear).toEqual(full.releaseYear);
    expect(top2.excludeEntities).toEqual(full.excludeEntities);
    expect(top2.excludeTags).toEqual(full.excludeTags);
  });

  it("omits the interests key entirely when there are none", () => {
    const params = buildInsightsParams(cues("music"), bound({ signals: toSignals({ ...PROFILE, seeds: PROFILE.seeds.slice(0, 2) }, false) }));
    expect(params.interests).toEqual(["s-1", "s-2"]);
    const none = buildInsightsParams(
      cues("music"),
      bound({ signals: { interests: [], excludeEntities: [], excludeTags: [] } }),
    );
    expect("interests" in none).toBe(false);
  });
});

describe("validateInsightsParams (bad_param, L4)", () => {
  const base: InsightsParams = { filterType: "urn:entity:artist", take: 15 };

  it("accepts a normal request", () => {
    expect(validateInsightsParams(base)).toBeUndefined();
    expect(validateInsightsParams({ filterType: "urn:entity:artist" })).toBeUndefined();
    expect(validateInsightsParams({ ...base, take: 50 })).toBeUndefined();
  });

  it.each([0, -1, 1.5, Number.NaN, 51, Number.POSITIVE_INFINITY])("rejects take = %s", (take) => {
    expect(validateInsightsParams({ ...base, take })).toMatch(/take/);
  });

  it("rejects a release year range that is backwards or not whole years", () => {
    expect(validateInsightsParams({ ...base, releaseYear: { min: 1976, max: 1956 } })).toMatch(/release/);
    expect(validateInsightsParams({ ...base, releaseYear: { min: 1956.5, max: 1976 } })).toMatch(/release/);
  });

  it("rejects an empty re-rank shortlist", () => {
    expect(validateInsightsParams({ ...base, resultEntities: [] })).toMatch(/results/);
  });
});
