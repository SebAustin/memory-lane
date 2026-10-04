import "server-only";
import { MAX_ENTITY_QUERY, MAX_TAG_QUERY, type Domain, type SeedCandidate, type TagCandidate } from "@/contracts";
import { nameSimilarity } from "@/domain/nameSimilarity";
import { DOMAIN_URN, type Envelope, type QlooClient, type QlooEntity, type QlooTag } from "./types";

/**
 * Turns what the Caregiver typed into a confirmed Qloo entity or tag (PLAN 3.1,
 * FR-4, FR-5). Search hits are candidates only: a match is `ok` when the top
 * hit is near-exact AND clearly ahead of the runner-up; anything less is
 * `needs_input`, and the Caregiver chooses. Nothing is ever picked for them.
 */

/** The top hit must be at least this close to the typed name... */
export const CONFIDENT_MIN = 0.92;
/** ...and the runner-up must be below this, or the choice is ambiguous. */
export const RUNNER_UP_MAX = 0.8;
const MAX_CANDIDATES = 5;
const SEARCH_TAKE = 10;

interface Ranked<T> {
  readonly item: T;
  readonly score: number;
}

function rank<T>(items: readonly T[], nameOf: (item: T) => string, query: string): Ranked<T>[] {
  return items
    .map((item) => ({ item, score: nameSimilarity(query, nameOf(item)) }))
    .sort((a, b) => b.score - a.score);
}

function isConfident<T>(ranked: readonly Ranked<T>[]): boolean {
  const [top, runnerUp] = ranked;
  return top !== undefined && top.score >= CONFIDENT_MIN && (runnerUp === undefined || runnerUp.score < RUNNER_UP_MAX);
}

/** Shapes a decision as an Envelope, keeping the client's provenance and hint. */
function decide<T, C>(
  source: Envelope<readonly T[]>,
  items: readonly T[],
  nameOf: (item: T) => string,
  query: string,
  toCandidate: (item: T) => C,
): Envelope<C[]> {
  const { provenance, hint } = source;
  const withHint = hint === undefined ? {} : { hint };
  if (items.length === 0) return { status: "empty", data: [], provenance, ...withHint };

  const ranked = rank(items, nameOf, query);
  if (isConfident(ranked)) {
    return { status: "ok", data: [toCandidate(ranked[0]!.item)], provenance, ...withHint };
  }
  return {
    status: "needs_input",
    data: ranked.slice(0, MAX_CANDIDATES).map(({ item }) => toCandidate(item)),
    provenance,
    ...withHint,
  };
}

/** A failed lookup is passed on untouched: the Caregiver is told Qloo is unreachable, not that nothing matched. */
const failed = (source: Envelope<unknown>): boolean => source.data === null || source.status === "error";

const unique = <T>(items: readonly T[], keyOf: (item: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function toSeedCandidate(entity: QlooEntity): SeedCandidate {
  return {
    entityId: entity.entityId,
    name: entity.name,
    domain: entity.domain,
    ...(entity.year === undefined ? {} : { year: entity.year }),
    ...(entity.description === undefined ? {} : { description: entity.description }),
    imageUrl: entity.imageUrl,
  };
}

export interface SeedQuery {
  readonly query: string;
  /** Limit the search to one kind of Cue; omitted, every Cue type is searched. */
  readonly domain?: Domain;
}

/**
 * Looks a Seed or an Avoid List entity up by name. `ok` carries the one
 * confident match (to confirm); `needs_input` carries up to five candidates
 * for the Caregiver to choose from; `empty` and errors pass through.
 */
export async function resolveSeed(
  client: QlooClient,
  { query, domain }: SeedQuery,
  opts?: Parameters<QlooClient["search"]>[1],
): Promise<Envelope<SeedCandidate[]>> {
  const text = query.trim().slice(0, MAX_ENTITY_QUERY);
  const types = domain === undefined ? Object.values(DOMAIN_URN) : [DOMAIN_URN[domain]];
  const source = await client.search({ query: text, types, take: SEARCH_TAKE }, opts);
  if (failed(source)) return { ...source, data: null };

  const wanted = (source.data ?? []).filter((entity) => domain === undefined || entity.domain === domain);
  return decide(source, unique(wanted, (entity) => entity.entityId), (entity) => entity.name, text, toSeedCandidate);
}

/**
 * Maps an Avoid topic to a Qloo tag (FR-5). `ok` only when the tag's name is
 * near-exact; a looser match is `needs_input`, which callers treat as "no tag"
 * and keep the topic as Prompt guidance only.
 */
export async function resolveTag(
  client: QlooClient,
  { query }: { readonly query: string },
  opts?: Parameters<QlooClient["tags"]>[1],
): Promise<Envelope<TagCandidate[]>> {
  const text = query.trim().slice(0, MAX_TAG_QUERY);
  const source = await client.tags({ query: text, take: SEARCH_TAKE }, opts);
  if (failed(source)) return { ...source, data: null };

  const tags: readonly QlooTag[] = unique(source.data ?? [], (tag) => tag.id);
  return decide(source, tags, (tag) => tag.name, text, (tag): TagCandidate => ({ id: tag.id, name: tag.name }));
}
