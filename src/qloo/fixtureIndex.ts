import "server-only";
import { z } from "zod";
import { DOMAIN_URN, type EntityUrn } from "./types";

/**
 * Loading and validating the fixture index (`fixtures/qloo/index.json`).
 * Fixtures are trusted dev data, so a malformed one throws at load time
 * instead of degrading silently.
 */

const EntityUrnSchema = z.enum(Object.values(DOMAIN_URN) as [EntityUrn, ...EntityUrn[]]);
const InsightsTypeSchema = z.union([EntityUrnSchema, z.literal("urn:tag")]);

const IndexFile = z.object({
  version: z.literal(1),
  insights: z.array(
    z.object({
      type: InsightsTypeSchema,
      /** One hometown spelling, or several. Matched case-insensitively. */
      location: z.union([z.string(), z.array(z.string())]).optional(),
      window: z.object({ min: z.number().int(), max: z.number().int() }).optional(),
      /**
       * Entity ids of the persona's Seeds. Several files can share one lookup
       * key (brands and fingerprints have no window or location); the one whose
       * `seeds` overlap the request's interests most is served. Interests never
       * cause a miss, so a changed Taste Profile still hits a fixture.
       */
      seeds: z.array(z.string()).optional(),
      file: z.string().min(1),
    }),
  ),
  /** One catalog of Qloo-shaped entities that `/search` looks names up in. */
  search: z.object({ file: z.string().min(1) }).optional(),
  /** One catalog of tags that `/v2/tags` looks topics up in. */
  tags: z.object({ file: z.string().min(1) }).optional(),
});

/** A recorded `/v2/insights` response: `results.entities`, or `results.tags` for a fingerprint. */
const InsightsResponseFile = z.looseObject({
  results: z.looseObject({
    entities: z.array(z.unknown()).optional(),
    tags: z.array(z.unknown()).optional(),
  }),
});

/** A recorded `/search` response: a catalog of entities. */
const SearchResponseFile = z.looseObject({ results: z.array(z.unknown()) });

/** A recorded `/v2/tags` response. */
const TagsResponseFile = z.looseObject({
  results: z.looseObject({ tags: z.array(z.unknown()) }),
});

export interface FixtureMatch {
  readonly type: EntityUrn | "urn:tag";
  /** Accepted location spellings (empty: the request must carry none). */
  readonly locations: readonly string[];
  readonly window?: { readonly min: number; readonly max: number };
  readonly seeds: readonly string[];
}

export interface FixtureEntry {
  readonly match: FixtureMatch;
  /** Raw Qloo-shaped entities, normalized by the client with its image allow-list. */
  readonly rawEntities: readonly unknown[];
  /** Raw Qloo-shaped tags, for a fingerprint (`urn:tag`) entry. */
  readonly rawTags: readonly unknown[];
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

/**
 * Validates the fixture index and resolves each entry's file from `files`
 * (file name to parsed JSON).
 */
export function loadFixtureIndex(
  index: unknown,
  files: Readonly<Record<string, unknown>>,
): FixtureIndex {
  const parsedIndex = IndexFile.safeParse(index);
  if (!parsedIndex.success) {
    throw new Error(`Invalid fixture index: ${summarize(parsedIndex.error)}`);
  }

  const insights = parsedIndex.data.insights.map(({ file, location, seeds, type, window }): FixtureEntry => {
    const parsedFile = InsightsResponseFile.safeParse(files[file]);
    const results = parsedFile.success ? parsedFile.data.results : undefined;
    const rawEntities = type === "urn:tag" ? [] : results?.entities;
    const rawTags = type === "urn:tag" ? results?.tags : [];
    if (rawEntities === undefined || rawTags === undefined) {
      throw new Error(`Fixture file "${file}" is missing or not a Qloo insights response`);
    }
    return {
      match: {
        type,
        locations: location === undefined ? [] : [location].flat(),
        ...(window === undefined ? {} : { window }),
        seeds: seeds ?? [],
      },
      rawEntities,
      rawTags,
    };
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
