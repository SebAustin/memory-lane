import "server-only";
import { z } from "zod";
import { nameSimilarity } from "@/domain/nameSimilarity";
import { containsRun, wordsOf } from "@/domain/screening";
import { normalizeEntity } from "./normalize";
import {
  DOMAIN_URN,
  type EntityUrn,
  type Envelope,
  type InsightsParams,
  type QlooClient,
  type QlooEntity,
  type QlooProvenance,
  type QlooTag,
  type SearchQuery,
  type TagQuery,
} from "./types";

/**
 * Minimal fixture-backed Qloo client (ticket 02). It serves Qloo-shaped
 * responses from `fixtures/qloo/index.json` so the app runs with no key
 * (NFR-22). Ticket 06 extends it to full Qloo semantics: tag signals,
 * re-rank, synthetic explainability and strict mode (PLAN section 3.1).
 */

const INSIGHTS_ENDPOINT = "/v2/insights";
const DEFAULT_TAKE = 20;
const SEARCH_ENDPOINT = "/search";
const TAGS_ENDPOINT = "/v2/tags";
const DEFAULT_SEARCH_TAKE = 10;
/** A fixture hit must look at least this much like the query. Looser than a confident match (0.92), so near-misses become choices. */
const FIXTURE_MATCH_MIN = 0.7;
const NO_FIXTURE_HINT =
  "Fixture mode: no fixture matches this request. Try the demo story, Margaret.";
/** Shown when a `/search` or `/v2/tags` query matches nothing (PLAN 3.1, R3). */
export const FIXTURE_SEARCH_HINT = "Fixture mode: try the demo Seeds (P1-P5)";

const EntityUrnSchema = z.enum(Object.values(DOMAIN_URN) as [EntityUrn, ...EntityUrn[]]);

const IndexFile = z.object({
  version: z.literal(1),
  insights: z.array(
    z.object({
      type: EntityUrnSchema,
      location: z.string().optional(),
      window: z.object({ min: z.number().int(), max: z.number().int() }).optional(),
      file: z.string().min(1),
    }),
  ),
  /** One catalog of Qloo-shaped entities that `/search` looks names up in. */
  search: z.object({ file: z.string().min(1) }).optional(),
  /** One catalog of tags that `/v2/tags` looks topics up in. */
  tags: z.object({ file: z.string().min(1) }).optional(),
});

/** A recorded `/v2/insights` response: only `results.entities` is read. */
const InsightsResponseFile = z.looseObject({
  results: z.looseObject({ entities: z.array(z.unknown()) }),
});

/** A recorded `/search` response: a catalog of entities. */
const SearchResponseFile = z.looseObject({ results: z.array(z.unknown()) });

/** A recorded `/v2/tags` response. */
const TagsResponseFile = z.looseObject({
  results: z.looseObject({ tags: z.array(z.unknown()) }),
});

const RawTag = z.looseObject({ tag_id: z.string().min(1).max(64), name: z.string().min(1).max(80) });

export interface FixtureMatch {
  readonly type: EntityUrn;
  readonly location?: string;
  readonly window?: { readonly min: number; readonly max: number };
}

export interface FixtureEntry {
  readonly match: FixtureMatch;
  /** Raw Qloo-shaped entities, normalized by the client with its image allow-list. */
  readonly rawEntities: readonly unknown[];
}

export interface FixtureIndex {
  readonly insights: readonly FixtureEntry[];
  /** Raw Qloo-shaped entities for `/search` (empty when the index has no catalog). */
  readonly searchCatalog?: readonly unknown[];
  /** Raw Qloo-shaped tags for `/v2/tags`. */
  readonly tagCatalog?: readonly unknown[];
}

function summarize(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
}

/**
 * Validates the fixture index and resolves each entry's file from `files`
 * (file name to parsed JSON). Fixtures are trusted dev data, so a malformed
 * one throws at load time instead of degrading silently.
 */
export function loadFixtureIndex(
  index: unknown,
  files: Readonly<Record<string, unknown>>,
): FixtureIndex {
  const parsedIndex = IndexFile.safeParse(index);
  if (!parsedIndex.success) {
    throw new Error(`Invalid fixture index: ${summarize(parsedIndex.error)}`);
  }

  const insights = parsedIndex.data.insights.map(({ file, ...match }): FixtureEntry => {
    const parsedFile = InsightsResponseFile.safeParse(files[file]);
    if (!parsedFile.success) {
      throw new Error(`Fixture file "${file}" is missing or not a Qloo insights response`);
    }
    return { match, rawEntities: parsedFile.data.results.entities };
  });

  const searchCatalog = loadCatalog("search", parsedIndex.data.search?.file, files, (file) => {
    const parsed = SearchResponseFile.safeParse(file);
    return parsed.success ? parsed.data.results : undefined;
  });
  const tagCatalog = loadCatalog("tags", parsedIndex.data.tags?.file, files, (file) => {
    const parsed = TagsResponseFile.safeParse(file);
    return parsed.success ? parsed.data.results.tags : undefined;
  });
  return { insights, searchCatalog, tagCatalog };
}

function loadCatalog(
  what: string,
  fileName: string | undefined,
  files: Readonly<Record<string, unknown>>,
  extract: (file: unknown) => readonly unknown[] | undefined,
): readonly unknown[] {
  if (fileName === undefined) return [];
  const items = extract(files[fileName]);
  if (items === undefined) throw new Error(`Fixture file "${fileName}" is missing or not a Qloo ${what} response`);
  return items;
}

const normalizeLocation = (value: string | undefined): string | undefined =>
  value?.trim().toLowerCase();

function matches(match: FixtureMatch, params: InsightsParams): boolean {
  return (
    match.type === params.filterType &&
    normalizeLocation(match.location) === normalizeLocation(params.locationQuery) &&
    match.window?.min === params.releaseYear?.min &&
    match.window?.max === params.releaseYear?.max
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

function byAffinityDesc(a: QlooEntity, b: QlooEntity): number {
  return (b.affinity ?? -1) - (a.affinity ?? -1);
}

function applyExclusions(entities: readonly QlooEntity[], params: InsightsParams): QlooEntity[] {
  const excludedIds = new Set(params.excludeEntities);
  const excludedTags = new Set(params.excludeTags);
  return entities.filter(
    (entity) =>
      !excludedIds.has(entity.entityId) && !entity.tags.some((tag) => excludedTags.has(tag.id)),
  );
}

/** Name-free provenance for a fixture answer: the key never holds the typed text. */
const fixtureProvenance = (endpoint: string, paramsKey: string): QlooProvenance => ({
  endpoint,
  paramsKey,
  cached: false,
  stale: false,
  retries: 0,
  ms: 0,
  synthetic: true,
});

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
}

/**
 * Looks like Qloo for the requests the fixtures cover. Matching ignores
 * `interests` (and the exclusions, which are applied afterwards), so a
 * changed Taste Profile still hits fixtures (PLAN R3).
 */
export class FixtureQlooClient implements QlooClient {
  private readonly entries: ReadonlyArray<{
    readonly match: FixtureMatch;
    readonly entities: readonly QlooEntity[];
  }>;
  private readonly searchCatalog: readonly QlooEntity[];
  private readonly tagCatalog: readonly QlooTag[];

  constructor({ index, imageHosts }: FixtureClientOptions) {
    this.entries = index.insights.map(({ match, rawEntities }) => ({
      match,
      entities: rawEntities.flatMap((raw) => normalizeEntity(raw, imageHosts) ?? []),
    }));
    this.searchCatalog = (index.searchCatalog ?? []).flatMap((raw) => normalizeEntity(raw, imageHosts) ?? []);
    this.tagCatalog = (index.tagCatalog ?? []).flatMap((raw) => {
      const parsed = RawTag.safeParse(raw);
      return parsed.success ? [{ id: parsed.data.tag_id, name: parsed.data.name }] : [];
    });
  }

  /** Looks a name up in the catalog the way Qloo's fuzzy search would: close spellings and names that contain the query. */
  async search({ query, types, take = DEFAULT_SEARCH_TAKE }: SearchQuery): Promise<Envelope<readonly QlooEntity[]>> {
    const provenance = fixtureProvenance(SEARCH_ENDPOINT, `types=${types.join(",")}&take=${take}`);
    const hits = closest(
      this.searchCatalog.filter((entity) => types.includes(entity.type)),
      (entity) => entity.name,
      query,
    ).slice(0, take);
    return hits.length === 0
      ? { status: "empty", data: [], provenance, hint: FIXTURE_SEARCH_HINT }
      : { status: "ok", data: hits, provenance };
  }

  /** Finds tags whose name is close to the topic. */
  async tags({ query, take = DEFAULT_SEARCH_TAKE }: TagQuery): Promise<Envelope<readonly QlooTag[]>> {
    const provenance = fixtureProvenance(TAGS_ENDPOINT, `take=${take}`);
    const hits = closest(this.tagCatalog, (tag) => tag.name, query).slice(0, take);
    return hits.length === 0
      ? { status: "empty", data: [], provenance, hint: FIXTURE_SEARCH_HINT }
      : { status: "ok", data: hits, provenance };
  }

  async insights(params: InsightsParams): Promise<Envelope<{ readonly entities: readonly QlooEntity[] }>> {
    const provenance = {
      endpoint: INSIGHTS_ENDPOINT,
      paramsKey: paramsKey(params),
      cached: false,
      stale: false,
      retries: 0,
      ms: 0,
      synthetic: true,
    } as const;

    const entry = this.entries.find((candidate) => matches(candidate.match, params));
    const entities = entry
      ? applyExclusions(entry.entities, params)
          .sort(byAffinityDesc)
          .slice(0, params.take ?? DEFAULT_TAKE)
      : [];

    if (entities.length === 0) {
      return { status: "empty", data: { entities: [] }, provenance, hint: NO_FIXTURE_HINT };
    }
    return { status: "ok", data: { entities }, provenance };
  }
}
