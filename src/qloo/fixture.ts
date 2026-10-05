import "server-only";
import { z } from "zod";
import type { Domain } from "@/contracts";
import { nameSimilarity } from "@/domain/nameSimilarity";
import { containsRun, wordsOf } from "@/domain/screening";
import { DEFAULT_RETRY } from "./backoff";
import { createFaultPlan, errorCodeFor, isRetryable, type Fault, type FaultPlan, type FaultScope } from "./faults";
import { syntheticScore } from "./fnv";
import type { FixtureEntry, FixtureIndex } from "./fixtureIndex";
import { normalizeEntity, normalizeTag } from "./normalize";
import { validateInsightsParams } from "./params";
import {
  DOMAIN_URN,
  type CallOpts,
  type Envelope,
  type ErrorCode,
  type InsightsParams,
  type InsightsResult,
  type QlooClient,
  type QlooEntity,
  type QlooProvenance,
  type QlooTag,
  type SearchQuery,
  type TagQuery,
} from "./types";

export { loadFixtureIndex } from "./fixtureIndex";
export type { FixtureEntry, FixtureIndex, FixtureMatch } from "./fixtureIndex";

/**
 * The fixture-backed Qloo client: it behaves like Qloo for any Taste Profile
 * (PLAN 3.1, R3, 14.3), so the whole product works before the key arrives
 * (NFR-22). It serves Qloo-shaped responses from `fixtures/qloo/`:
 *
 * - **Lookup** is by `(endpoint, filter.type, release-year window, location)`.
 *   Interests never cause a miss, so regenerating after Reactions still hits.
 * - **Exclusions** (`filter.exclude.entities` and `.tags`) are applied here.
 * - **Tag signals** (`expand_theme`) return only entities carrying one of the
 *   tags, and `empty` when none does: never the unfiltered set (14.3).
 * - **Re-rank** (`filter.results.entities`) returns those ids, re-scored,
 *   from any loaded fixture.
 * - **Explainability** is deterministic (FNV-1a, 0.30 to 0.90) for every
 *   requested Seed and Learned Favorite, and is flagged synthetic.
 * - **Faults** (`QLOO_FIXTURE_FAULTS`) fail calls as the resilient client
 *   would report them.
 */

const INSIGHTS_ENDPOINT = "/v2/insights";
const DEFAULT_TAKE = 20;
const SEARCH_ENDPOINT = "/search";
const TAGS_ENDPOINT = "/v2/tags";
const DEFAULT_SEARCH_TAKE = 10;
/** Qloo's cap on `take` for `/search`. */
const MAX_SEARCH_TAKE = 199;
/** A fixture hit must look at least this much like the query. Looser than a confident match (0.92), so near-misses become choices. */
const FIXTURE_MATCH_MIN = 0.7;
const NO_FIXTURE_HINT =
  "Fixture mode: no fixture matches this request. Try the demo story, Margaret.";
const NOTHING_MATCHES_HINT = "Fixture mode: nothing in the fixtures matches these filters.";
const NO_TAG_MATCH_HINT = "Fixture mode: no entity carries these tags.";
/** Shown when a `/search` or `/v2/tags` query matches nothing (PLAN 3.1, R3). */
export const FIXTURE_SEARCH_HINT = "Fixture mode: try the demo Seeds (P1-P5)";

const RawTag = z.looseObject({ tag_id: z.string().min(1).max(64), name: z.string().min(1).max(80) });

interface CompiledEntry {
  readonly entry: FixtureEntry;
  readonly entities: readonly QlooEntity[];
  readonly tags: readonly QlooTag[];
  readonly tagIds: ReadonlySet<string>;
}

interface Compiled {
  readonly entries: readonly CompiledEntry[];
  readonly searchCatalog: readonly QlooEntity[];
  readonly tagCatalog: readonly QlooTag[];
  /** Every loaded entity by id, first one wins: what re-rank looks ids up in. */
  readonly byId: ReadonlyMap<string, QlooEntity>;
}

/** Normalizing the fixtures is the costly part, and handlers build a client per request, so it is done once per index. */
const compiledCache = new WeakMap<FixtureIndex, Map<string, Compiled>>();

function compile(index: FixtureIndex, imageHosts: readonly string[]): Compiled {
  const hostsKey = imageHosts.join(",");
  const cached = compiledCache.get(index)?.get(hostsKey);
  if (cached !== undefined) return cached;

  const entries = index.insights.map((entry): CompiledEntry => {
    const entities = entry.rawEntities.flatMap((raw) => normalizeEntity(raw, imageHosts) ?? []);
    const tags = entry.rawTags.flatMap((raw) => normalizeTag(raw) ?? []);
    const carried = entities.flatMap((entity) => entity.tags.map((tag) => tag.id));
    return { entry, entities, tags, tagIds: new Set(carried) };
  });
  const searchCatalog = (index.searchCatalog ?? []).flatMap((raw) => normalizeEntity(raw, imageHosts) ?? []);
  const tagCatalog = (index.tagCatalog ?? []).flatMap((raw) => {
    const parsed = RawTag.safeParse(raw);
    return parsed.success ? [{ id: parsed.data.tag_id, name: parsed.data.name }] : [];
  });

  const byId = new Map<string, QlooEntity>();
  for (const entity of [...entries.flatMap((compiled) => compiled.entities), ...searchCatalog]) {
    if (!byId.has(entity.entityId)) byId.set(entity.entityId, entity);
  }
  const compiled: Compiled = { entries, searchCatalog, tagCatalog, byId };
  const forIndex = compiledCache.get(index) ?? new Map<string, Compiled>();
  forIndex.set(hostsKey, compiled);
  compiledCache.set(index, forIndex);
  return compiled;
}

const normalizeLocation = (value: string | undefined): string | undefined => value?.trim().toLowerCase();

/** The location Qloo would be asked about: music signals it, places filter by it. */
const locationOf = (params: InsightsParams): string | undefined =>
  normalizeLocation(params.locationQuery ?? params.filterLocationQuery);

function matches({ entry }: CompiledEntry, params: InsightsParams): boolean {
  const { match } = entry;
  const location = locationOf(params);
  const locationOk =
    location === undefined ? match.locations.length === 0 : match.locations.some((one) => normalizeLocation(one) === location);
  return (
    match.type === params.filterType &&
    locationOk &&
    match.window?.min === params.releaseYear?.min &&
    match.window?.max === params.releaseYear?.max
  );
}

/**
 * Several files can share one key (see the index `seeds` field): prefer the one
 * built for these Seeds, then the one that carries the requested tags, then the first.
 */
function pickBest(candidates: readonly CompiledEntry[], params: InsightsParams): CompiledEntry | undefined {
  const interests = new Set(params.interests);
  const wanted = params.interestTags ?? [];
  const score = ({ entry, tagIds }: CompiledEntry): number =>
    entry.match.seeds.filter((seed) => interests.has(seed)).length * 1000 +
    wanted.filter((tag) => tagIds.has(tag)).length;
  return candidates.reduce<CompiledEntry | undefined>(
    (best, candidate) => (best === undefined || score(candidate) > score(best) ? candidate : best),
    undefined,
  );
}

/** Name-free, order-stable key of the request, for provenance. */
function paramsKey(params: InsightsParams): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("&");
}

const byAffinityDesc = (a: QlooEntity, b: QlooEntity): number =>
  (b.affinity ?? -1) - (a.affinity ?? -1) || a.entityId.localeCompare(b.entityId);

function applyExclusions(entities: readonly QlooEntity[], params: InsightsParams): QlooEntity[] {
  const excludedIds = new Set(params.excludeEntities);
  const excludedTags = new Set(params.excludeTags);
  return entities.filter(
    (entity) =>
      !excludedIds.has(entity.entityId) && !entity.tags.some((tag) => excludedTags.has(tag.id)),
  );
}

/** Per-Seed contribution, deterministic for the (entity, Seed) pair and flagged synthetic by the provenance. */
function explain(entity: QlooEntity, params: InsightsParams): QlooEntity {
  const interests = params.explainability === true ? (params.interests ?? []) : [];
  return {
    ...entity,
    explainability: Object.fromEntries(
      interests.map((seed) => [seed, syntheticScore(`${entity.entityId}|${seed}`)]),
    ),
  };
}

/** A re-rank's new affinity: the fixture's own score blended with a deterministic one for these interests. */
function rescore(entity: QlooEntity, params: InsightsParams): QlooEntity {
  const fresh = syntheticScore(`rerank|${entity.entityId}|${(params.interests ?? []).join(",")}`);
  const affinity = Math.round(((entity.affinity ?? 0.5) * 0.4 + fresh * 0.6) * 100) / 100;
  return { ...entity, affinity };
}

const URN_SCOPE: ReadonlyMap<string, Domain> = new Map(
  Object.entries(DOMAIN_URN).map(([domain, urn]) => [urn, domain as Domain]),
);
const scopeOf = (params: InsightsParams): Exclude<FaultScope, "all"> =>
  params.filterType === "urn:tag" ? "fingerprint" : (URN_SCOPE.get(params.filterType) ?? "music");

/** Name-free provenance for a fixture answer: the key never holds the typed text. */
const fixtureProvenance = (endpoint: string, paramsKey: string, retries = 0): QlooProvenance => ({
  endpoint,
  paramsKey,
  cached: false,
  stale: false,
  retries,
  ms: 0,
  synthetic: true,
});

function failure<T>(endpoint: string, key: string, errorCode: ErrorCode, retries = 0, hint?: string): Envelope<T> {
  return {
    status: "error",
    data: null,
    provenance: fixtureProvenance(endpoint, key, retries),
    errorCode,
    ...(hint === undefined ? {} : { hint }),
  };
}

/** Items whose name is close to `query` or contains all its words, best match first. */
function closest<T>(items: readonly T[], nameOf: (item: T) => string, query: string): T[] {
  const queryWords = wordsOf(query);
  return items
    .map((item) => ({ item, score: nameSimilarity(query, nameOf(item)) }))
    .filter(
      ({ item, score }) =>
        score >= FIXTURE_MATCH_MIN || (queryWords.length > 0 && containsRun(wordsOf(nameOf(item)), queryWords)),
    )
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

export interface FixtureClientOptions {
  readonly index: FixtureIndex;
  /** Same allow-list as the CSP `img-src` (`QLOO_IMAGE_HOSTS`). */
  readonly imageHosts: readonly string[];
  /** Throw on an `insights` request for a `(type, window, location)` that no fixture covers, instead of answering `empty`. For tests. */
  readonly strict?: boolean;
  /** Failures to inject, from `parseFaults(QLOO_FIXTURE_FAULTS)`. */
  readonly faults?: readonly Fault[];
}

export class FixtureQlooClient implements QlooClient {
  private readonly data: Compiled;
  private readonly strict: boolean;
  private readonly faults: FaultPlan;

  constructor({ index, imageHosts, strict = false, faults = [] }: FixtureClientOptions) {
    this.data = compile(index, imageHosts);
    this.strict = strict;
    this.faults = createFaultPlan(faults);
  }

  /**
   * Spends the budget, then plays out injected faults the way the resilient
   * client would see them: retried (up to 3 times) when transient. Returns the
   * error to answer with, or the number of failed requests before success.
   */
  private gate(
    scope: Exclude<FaultScope, "all">,
    endpoint: string,
    key: string,
    opts?: CallOpts,
  ): { readonly error: Envelope<never> } | { readonly retries: number } {
    if (opts?.budget !== undefined && !opts.budget.take(opts.budgetKind ?? "prefetch")) {
      return { error: failure(endpoint, key, "budget", 0, "Qloo call budget reached") };
    }
    for (let retries = 0; ; retries += 1) {
      const fault = this.faults.next(scope);
      if (fault === undefined) return { retries };
      if (!isRetryable(fault) || retries >= DEFAULT_RETRY.maxRetries) {
        return { error: failure(endpoint, key, errorCodeFor(fault), retries) };
      }
    }
  }

  /** Looks a name up in the catalog the way Qloo's fuzzy search would: close spellings and names that contain the query. */
  async search(
    { query, types, take = DEFAULT_SEARCH_TAKE }: SearchQuery,
    opts?: CallOpts,
  ): Promise<Envelope<readonly QlooEntity[]>> {
    const key = `types=${types.join(",")}&take=${take}`;
    if (!Number.isInteger(take) || take < 1 || take > MAX_SEARCH_TAKE) {
      return failure(SEARCH_ENDPOINT, key, "bad_param", 0, `take must be a whole number from 1 to ${MAX_SEARCH_TAKE}`);
    }
    const gate = this.gate("search", SEARCH_ENDPOINT, key, opts);
    if ("error" in gate) return gate.error;

    const provenance = fixtureProvenance(SEARCH_ENDPOINT, key, gate.retries);
    const hits = closest(
      this.data.searchCatalog.filter((entity) => types.includes(entity.type)),
      (entity) => entity.name,
      query,
    ).slice(0, take);
    return hits.length === 0
      ? { status: "empty", data: [], provenance, hint: FIXTURE_SEARCH_HINT }
      : { status: "ok", data: hits, provenance };
  }

  /** Finds tags whose name is close to the topic. */
  async tags({ query, take = DEFAULT_SEARCH_TAKE }: TagQuery, opts?: CallOpts): Promise<Envelope<readonly QlooTag[]>> {
    const key = `take=${take}`;
    if (!Number.isInteger(take) || take < 1) {
      return failure(TAGS_ENDPOINT, key, "bad_param", 0, "take must be a positive whole number");
    }
    const gate = this.gate("tags", TAGS_ENDPOINT, key, opts);
    if ("error" in gate) return gate.error;

    const provenance = fixtureProvenance(TAGS_ENDPOINT, key, gate.retries);
    const hits = closest(this.data.tagCatalog, (tag) => tag.name, query).slice(0, take);
    return hits.length === 0
      ? { status: "empty", data: [], provenance, hint: FIXTURE_SEARCH_HINT }
      : { status: "ok", data: hits, provenance };
  }

  async insights(params: InsightsParams, opts?: CallOpts): Promise<Envelope<InsightsResult>> {
    const key = paramsKey(params);
    const problem = validateInsightsParams(params);
    if (problem !== undefined) return failure(INSIGHTS_ENDPOINT, key, "bad_param", 0, problem);
    const gate = this.gate(scopeOf(params), INSIGHTS_ENDPOINT, key, opts);
    if ("error" in gate) return gate.error;

    const provenance = fixtureProvenance(INSIGHTS_ENDPOINT, key, gate.retries);
    const take = params.take ?? DEFAULT_TAKE;
    if (params.resultEntities !== undefined) return this.rerank(params, take, provenance);

    const compiled = pickBest(this.data.entries.filter((candidate) => matches(candidate, params)), params);
    if (compiled === undefined) {
      if (this.strict) throw new Error(`No fixture for ${describe(params)}`);
      return { status: "empty", data: { entities: [] }, provenance, hint: NO_FIXTURE_HINT };
    }
    if (params.filterType === "urn:tag") return this.fingerprint(compiled, params, take, provenance);
    return this.entities(compiled, params, take, provenance);
  }

  private fingerprint(
    { tags }: CompiledEntry,
    params: InsightsParams,
    take: number,
    provenance: QlooProvenance,
  ): Envelope<InsightsResult> {
    const excluded = new Set(params.excludeTags);
    const kept = tags
      .filter((tag) => !excluded.has(tag.id))
      .sort((a, b) => (b.affinity ?? 0) - (a.affinity ?? 0))
      .slice(0, take);
    return kept.length === 0
      ? { status: "empty", data: { entities: [], tags: [] }, provenance, hint: NOTHING_MATCHES_HINT }
      : { status: "ok", data: { entities: [], tags: kept }, provenance };
  }

  private entities(
    { entities }: CompiledEntry,
    params: InsightsParams,
    take: number,
    provenance: QlooProvenance,
  ): Envelope<InsightsResult> {
    const wanted = new Set(params.interestTags);
    const allowed = applyExclusions(entities, params);
    // A tag signal narrows to entities carrying one of the tags; when none does the answer is empty, never the unfiltered set (14.3).
    const tagged = wanted.size === 0 ? allowed : allowed.filter((entity) => entity.tags.some((tag) => wanted.has(tag.id)));
    const kept = tagged.sort(byAffinityDesc).slice(0, take).map((entity) => explain(entity, params));
    if (kept.length === 0) {
      const hint = wanted.size > 0 ? NO_TAG_MATCH_HINT : NOTHING_MATCHES_HINT;
      return { status: "empty", data: { entities: [] }, provenance, hint };
    }
    return { status: "ok", data: { entities: kept }, provenance };
  }

  /** `filter.results.entities`: those ids from any loaded fixture, re-scored, best first. Unknown ids are left out. */
  private rerank(params: InsightsParams, take: number, provenance: QlooProvenance): Envelope<InsightsResult> {
    const found = (params.resultEntities ?? []).flatMap((id) => this.data.byId.get(id) ?? []);
    const kept = applyExclusions(found, params)
      .map((entity) => rescore(entity, params))
      .sort(byAffinityDesc)
      .slice(0, take)
      .map((entity) => explain(entity, params));
    return kept.length === 0
      ? { status: "empty", data: { entities: [] }, provenance, hint: NOTHING_MATCHES_HINT }
      : { status: "ok", data: { entities: kept }, provenance };
  }
}

const describe = (params: InsightsParams): string =>
  `${params.filterType}, window ${params.releaseYear ? `${params.releaseYear.min}-${params.releaseYear.max}` : "none"}, location ${locationOf(params) ?? "none"}`;
