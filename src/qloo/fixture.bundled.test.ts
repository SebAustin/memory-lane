import { describe, expect, it } from "vitest";
import { createQlooClient } from "@/qloo";
import { FixtureQlooClient } from "@/qloo/fixture";
import { bundledFixtureIndex } from "@/qloo/fixtures";
import { buildInsightsParams, type BoundContext } from "@/qloo/params";
import { toSignals } from "@/domain/profile";
import { AGE_BUCKET, reminiscenceWindow } from "@/domain/window";
import { getServerConfig } from "@/server/config";
import type { Domain, TasteProfile } from "@/contracts";
import type { QlooEntity } from "@/qloo/types";

/** The five demo Persons (EVALS section 3). `book` is thin for P4 on purpose (EVALS (b)). */
const PERSONAS = [
  { id: "P1", birthYear: 1946, hometown: "Memphis", seeds: ["fx-artist-patsy-cline", "fx-film-pillow-talk", "fx-film-move-over-darling"] },
  { id: "P2", birthYear: 1935, hometown: "Leeds", seeds: ["fx-artist-lonnie-donegan", "fx-film-brief-encounter", "fx-tv-coronation-street"] },
  { id: "P3", birthYear: 1952, hometown: "Guadalajara", seeds: ["fx-artist-pedro-infante", "fx-artist-juan-gabriel", "fx-tv-el-chavo-del-ocho"] },
  { id: "P4", birthYear: 1958, hometown: "Manila", seeds: ["fx-artist-nora-aunor", "fx-artist-the-carpenters", "fx-tv-eat-bulaga"] },
  { id: "P5", birthYear: 1965, hometown: "Brooklyn", seeds: ["fx-artist-run-dmc", "fx-film-do-the-right-thing"] },
] as const;
const DOMAINS: readonly Domain[] = ["music", "film", "tv", "book", "place", "brand"];
const MIN_ENTITIES = 25;

const client = () => new FixtureQlooClient({ index: bundledFixtureIndex, imageHosts: [], strict: true });

function profile(seeds: readonly string[]): TasteProfile {
  return {
    version: 0,
    seeds: seeds.map((entityId) => ({ entityId, name: entityId })),
    learnedFavorites: [],
    exclusions: [],
    avoidTopics: [],
  };
}

function bound(persona: (typeof PERSONAS)[number], widened: BoundContext["widened"] = []): BoundContext {
  return {
    window: reminiscenceWindow(persona.birthYear),
    widened,
    ageBucket: AGE_BUCKET,
    hometown: persona.hometown,
    signals: toSignals(profile(persona.seeds), true),
    stage: "middle",
    previousCueIds: [],
  };
}

async function cues(persona: (typeof PERSONAS)[number], domain: Domain, widened: BoundContext["widened"] = []) {
  const params = buildInsightsParams({ kind: "cues", domain }, bound(persona, widened));
  // take 50 (Qloo's cap) reads the whole fixture, so coverage is measured, not the top 15.
  return client().insights({ ...params, take: 50 });
}

describe("every persona has every domain, in the original and the widened Window", () => {
  for (const persona of PERSONAS) {
    for (const domain of DOMAINS) {
      const widenable = domain === "film" || domain === "tv" || domain === "book";
      const emptyOnPurpose = persona.id === "P4" && domain === "book";

      it(`${persona.id} ${domain}: at least ${MIN_ENTITIES} entities, each with tags${emptyOnPurpose ? " (empty by design in the original Window)" : ""}`, async () => {
        const env = await cues(persona, domain);
        if (emptyOnPurpose) {
          expect(env).toMatchObject({ status: "empty", data: { entities: [] } });
          return;
        }
        const entities = env.data?.entities ?? [];
        expect(entities.length).toBeGreaterThanOrEqual(MIN_ENTITIES);
        expect(entities.every((entity) => entity.tags.length >= 1)).toBe(true);
        expect(entities.every((entity) => entity.domain === domain)).toBe(true);
      });

      if (widenable) {
        it(`${persona.id} ${domain}: the widened Window is covered and holds the original's Cues`, async () => {
          const original = await cues(persona, domain);
          const widened = await cues(persona, domain, [domain]);
          const originalIds = new Set(original.data?.entities.map((entity) => entity.entityId));
          const widenedIds = new Set(widened.data?.entities.map((entity) => entity.entityId));
          expect(widenedIds.size).toBeGreaterThan(0);
          for (const id of originalIds) expect(widenedIds.has(id)).toBe(true);
          if (!emptyOnPurpose) expect(widenedIds.size).toBeGreaterThan(originalIds.size);
        });
      }
    }

    it(`${persona.id}: a fingerprint of 20 tags`, async () => {
      const params = buildInsightsParams({ kind: "fingerprint" }, bound(persona));
      const env = await client().insights(params);
      expect(env.data?.tags).toHaveLength(20);
      expect(env.data?.tags?.every((tag) => (tag.affinity ?? 0) > 0)).toBe(true);
    });
  }
});

describe("the Window gates film, TV and books", () => {
  it.each(PERSONAS)("$id: original-Window Cues are inside it; widened Cues are inside +/- 3 years", async (persona) => {
    const { start, end } = reminiscenceWindow(persona.birthYear);
    for (const domain of ["film", "tv", "book"] as const) {
      const years = (env: Awaited<ReturnType<typeof cues>>) =>
        (env.data?.entities ?? []).map((entity: QlooEntity) => entity.year ?? Number.NaN);
      for (const year of years(await cues(persona, domain))) {
        expect(year).toBeGreaterThanOrEqual(start);
        expect(year).toBeLessThanOrEqual(end);
      }
      for (const year of years(await cues(persona, domain, [domain]))) {
        expect(year).toBeGreaterThanOrEqual(start - 3);
        expect(year).toBeLessThanOrEqual(end + 3);
      }
    }
  });
});

describe("special cases the evals rely on", () => {
  it("P3's TV set includes General Hospital (PLAN 14.1, EVALS (d))", async () => {
    const env = await cues(PERSONAS[2], "tv");
    expect(env.data?.entities.map((entity) => entity.name)).toContain("General Hospital");
  });

  it("one persona (P4) has no books in the original Window but some in the widened one (EVALS (b))", async () => {
    const original = await cues(PERSONAS[3], "book");
    const widened = await cues(PERSONAS[3], "book", ["book"]);
    expect(original.status).toBe("empty");
    expect(widened.status).toBe("ok");
    expect(widened.data?.entities.length).toBeGreaterThanOrEqual(5);
  });

  it("every other persona has books in the original Window", async () => {
    for (const persona of PERSONAS.filter((p) => p.id !== "P4")) {
      expect((await cues(persona, "book")).status).toBe("ok");
    }
  });

  it("P1 holds the music a Memphis fan would expect, plus the Avoid-topic look-alike", async () => {
    const env = await cues(PERSONAS[0], "music");
    const names = env.data?.entities.map((entity) => entity.name);
    expect(names).toEqual(expect.arrayContaining(["Patsy Cline", "Elvis Presley", "Tennessee Waltz Revue"]));
  });

  it("the ambiguous Doris Day search is in the catalog", async () => {
    const env = await createQlooClient(getServerConfig({})).search({
      query: "Doris Day",
      types: ["urn:entity:artist"],
    });
    expect(env.data?.filter((entity) => entity.name === "Doris Day").length).toBeGreaterThanOrEqual(2);
  });

  it("P1's war and Vietnam titles carry the sensitive 'War' tag, so the default exclusion removes them", async () => {
    const withDefaults = buildInsightsParams(
      { kind: "cues", domain: "film" },
      { ...bound(PERSONAS[0], ["film"]), signals: toSignals(profile(PERSONAS[0].seeds), false) },
    );
    const env = await client().insights({ ...withDefaults, take: 50 });
    const names = env.data?.entities.map((entity) => entity.name) ?? [];
    expect(names).not.toContain("Apocalypse Now");
    expect(names).not.toContain("The Bridge on the River Kwai");
    expect(names).toContain("Pillow Talk");
  });
});

describe("tag signals find something new (PLAN 14.3 strict-mode test)", () => {
  const cases = PERSONAS.flatMap((persona) =>
    DOMAINS.filter((domain) => !(persona.id === "P4" && domain === "book")).map((domain) => [persona.id, domain] as const),
  );

  it.each(cases)("%s %s: expand_theme yields at least 1 entity that the prefetch did not", async (personaId, domain) => {
    const persona = PERSONAS.find((candidate) => candidate.id === personaId)!;
    const context = bound(persona);
    const strict = client();

    const prefetch = await strict.insights(buildInsightsParams({ kind: "cues", domain }, context));
    const prefetched = new Set(prefetch.data?.entities.map((entity) => entity.entityId));
    expect(prefetched.size).toBeGreaterThan(0);

    const fingerprint = await strict.insights(buildInsightsParams({ kind: "fingerprint" }, context));
    const found = new Set<string>();
    for (const tag of fingerprint.data?.tags ?? []) {
      const expanded = await strict.insights(
        buildInsightsParams({ kind: "expand_theme", domain, tagIds: [tag.id], take: 10 }, context),
      );
      expect(expanded.status === "ok" || expanded.status === "empty").toBe(true);
      for (const entity of expanded.data?.entities ?? []) if (!prefetched.has(entity.entityId)) found.add(entity.entityId);
    }
    expect(found.size).toBeGreaterThanOrEqual(1);
  });

  it("a tag that no entity carries is empty, not the unfiltered set", async () => {
    const context = bound(PERSONAS[0]);
    const env = await client().insights(
      buildInsightsParams({ kind: "expand_theme", domain: "film", tagIds: ["fx-tag-no-such-theme"] }, context),
    );
    expect(env).toMatchObject({ status: "empty", data: { entities: [] } });
  });
});

describe("fixture integrity", () => {
  it("has unique ids inside each file, and the same id always means the same name and type", async () => {
    const seen = new Map<string, string>();
    for (const entry of bundledFixtureIndex.insights) {
      const ids = new Set<string>();
      for (const raw of entry.rawEntities as Array<{ entity_id: string; name: string; type: string }>) {
        expect(ids.has(raw.entity_id), `${raw.entity_id} twice in one file`).toBe(false);
        ids.add(raw.entity_id);
        const fingerprint = `${raw.type}|${raw.name}`;
        expect(seen.get(raw.entity_id) ?? fingerprint).toBe(fingerprint);
        seen.set(raw.entity_id, fingerprint);
      }
    }
  });

  it("keeps the demo Seeds under the ids the search catalog and Margaret use", () => {
    const ids = new Set(
      bundledFixtureIndex.insights.flatMap((entry) => (entry.rawEntities as Array<{ entity_id: string }>).map((e) => e.entity_id)),
    );
    for (const seed of ["fx-artist-patsy-cline", "fx-film-pillow-talk", "fx-film-move-over-darling", "fx-tv-general-hospital"]) {
      expect(ids.has(seed)).toBe(true);
    }
  });

  it("has no image URLs, so every Cue shows its monogram until the key arrives", () => {
    const json = JSON.stringify(bundledFixtureIndex.insights.map((entry) => entry.rawEntities));
    expect(json).not.toContain("http");
  });
});
