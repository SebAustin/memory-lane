import "server-only";
import { z } from "zod";
import type { WireQuery } from "./cacheKey";
import { normalizeEntity, normalizeTag } from "./normalize";
import type { InsightsParams, InsightsResult, QlooEntity, QlooTag, SearchQuery, TagQuery } from "./types";

/**
 * The Qloo wire format (docs/qloo-api.md): our parameters mapped to Qloo's
 * exact query names, and Qloo's responses checked at the boundary. A
 * parameter Qloo does not know is silently ignored, so these names are
 * contract-tested against the live API in slice K (`pnpm qloo:smoke`).
 */

export const INSIGHTS_ENDPOINT = "/v2/insights";
export const SEARCH_ENDPOINT = "/search";
export const TAGS_ENDPOINT = "/v2/tags";

const csv = (items: readonly string[]): string => items.join(",");

/** `GET /v2/insights` query for `params`. Absent parameters are left out. */
export function insightsQuery(params: InsightsParams): WireQuery {
  const query: Record<string, string> = { "filter.type": params.filterType };
  const set = (name: string, value: string | undefined): void => {
    if (value !== undefined && value !== "") query[name] = value;
  };
  const list = (name: string, items: readonly string[] | undefined): void =>
    set(name, items !== undefined && items.length > 0 ? csv(items) : undefined);

  list("signal.interests.entities", params.interests);
  list("signal.interests.tags", params.interestTags);
  set("signal.demographics.age", params.age);
  set("signal.location.query", params.locationQuery);
  set("filter.location.query", params.filterLocationQuery);
  list("filter.exclude.entities", params.excludeEntities);
  list("filter.exclude.tags", params.excludeTags);
  list("filter.results.entities", params.resultEntities);
  if (params.releaseYear !== undefined) {
    query["filter.release_year.min"] = String(params.releaseYear.min);
    query["filter.release_year.max"] = String(params.releaseYear.max);
  }
  if (params.priceLevelMax !== undefined) query["filter.price_level.max"] = String(params.priceLevelMax);
  if (params.explainability === true) query["feature.explainability"] = "true";
  if (params.take !== undefined) query.take = String(params.take);
  return query;
}

/** `GET /search` query. */
export function searchQuery({ query, types, take }: SearchQuery): WireQuery {
  return {
    query,
    types: csv(types),
    ...(take === undefined ? {} : { take: String(take) }),
  };
}

/** `GET /v2/tags` query: a semantic search, so "hospitals" finds tags by meaning. */
export function tagsQuery({ query, tagTypes, take }: TagQuery): WireQuery {
  return {
    "filter.query": query,
    "feature.semantic_search": "true",
    ...(tagTypes !== undefined && tagTypes.length > 0 ? { "filter.tag.types": csv(tagTypes) } : {}),
    ...(take === undefined ? {} : { take: String(take) }),
  };
}

/** A response that passed the shape check: `empty` when it holds nothing usable. */
export interface Interpreted<T> {
  readonly status: "ok" | "empty";
  readonly data: T;
}

const InsightsBody = z.looseObject({
  results: z.looseObject({
    entities: z.array(z.unknown()).optional(),
    tags: z.array(z.unknown()).optional(),
  }),
});
const SearchBody = z.looseObject({ results: z.array(z.unknown()) });
const TagsBody = z.looseObject({ results: z.looseObject({ tags: z.array(z.unknown()) }) });

function collect<T>(raw: readonly unknown[], normalize: (item: unknown) => T | null): T[] {
  return raw.flatMap((item) => normalize(item) ?? []);
}

/**
 * `/v2/insights` body. A `urn:tag` request answers under `results.tags`, any
 * other under `results.entities`. Undefined (a `schema` error) when the shape
 * is wrong, or when Qloo returned items and not one of them is a usable Cue:
 * that is a contract drift, not an empty answer.
 */
export function interpretInsights(
  body: unknown,
  wantsTags: boolean,
  imageHosts: readonly string[],
): Interpreted<InsightsResult> | undefined {
  const parsed = InsightsBody.safeParse(body);
  if (!parsed.success) return undefined;
  const raw = wantsTags ? parsed.data.results.tags : parsed.data.results.entities;
  if (raw === undefined) return undefined;

  if (wantsTags) {
    const tags = collect(raw, normalizeTag);
    if (raw.length > 0 && tags.length === 0) return undefined;
    return { status: tags.length === 0 ? "empty" : "ok", data: { entities: [], tags } };
  }
  const entities = collect(raw, (item) => normalizeEntity(item, imageHosts));
  if (raw.length > 0 && entities.length === 0) return undefined;
  return { status: entities.length === 0 ? "empty" : "ok", data: { entities } };
}

/** `/search` body: a list of candidates. Types we do not use as Cues are dropped. */
export function interpretSearch(
  body: unknown,
  imageHosts: readonly string[],
): Interpreted<readonly QlooEntity[]> | undefined {
  const parsed = SearchBody.safeParse(body);
  if (!parsed.success) return undefined;
  const entities = collect(parsed.data.results, (item) => normalizeEntity(item, imageHosts));
  return { status: entities.length === 0 ? "empty" : "ok", data: entities };
}

/** `/v2/tags` body. */
export function interpretTags(body: unknown): Interpreted<readonly QlooTag[]> | undefined {
  const parsed = TagsBody.safeParse(body);
  if (!parsed.success) return undefined;
  const tags = collect(parsed.data.results.tags, normalizeTag);
  if (parsed.data.results.tags.length > 0 && tags.length === 0) return undefined;
  return { status: tags.length === 0 ? "empty" : "ok", data: tags };
}
