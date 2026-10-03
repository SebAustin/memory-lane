import "server-only";
import { z } from "zod";
import { normalizeEntity } from "./normalize";
import {
  DOMAIN_URN,
  type EntityUrn,
  type Envelope,
  type InsightsParams,
  type QlooClient,
  type QlooEntity,
} from "./types";

/**
 * Minimal fixture-backed Qloo client (ticket 02). It serves Qloo-shaped
 * responses from `fixtures/qloo/index.json` so the app runs with no key
 * (NFR-22). Ticket 06 extends it to full Qloo semantics: tag signals,
 * re-rank, synthetic explainability and strict mode (PLAN section 3.1).
 */

const INSIGHTS_ENDPOINT = "/v2/insights";
const DEFAULT_TAKE = 20;
const NO_FIXTURE_HINT =
  "Fixture mode: no fixture matches this request. Try the demo story, Margaret.";

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
});

/** A recorded `/v2/insights` response: only `results.entities` is read. */
const InsightsResponseFile = z.looseObject({
  results: z.looseObject({ entities: z.array(z.unknown()) }),
});

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
  return { insights };
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

  constructor({ index, imageHosts }: FixtureClientOptions) {
    this.entries = index.insights.map(({ match, rawEntities }) => ({
      match,
      entities: rawEntities.flatMap((raw) => normalizeEntity(raw, imageHosts) ?? []),
    }));
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
