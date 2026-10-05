import "server-only";
import type { Domain } from "@/contracts";

export type { Domain } from "@/contracts";

/**
 * Qloo seam types (PLAN section 3.1): `insights` (ticket 02), `search` and
 * `tags` (ticket 04), implemented by the HTTP client (ticket 05) and the
 * fixture client (ticket 06). `compare` arrives with shared listening (ticket 30).
 */

/** Qloo entity types Memory Lane uses as Cues. */
export type EntityUrn =
  | "urn:entity:artist"
  | "urn:entity:movie"
  | "urn:entity:tv_show"
  | "urn:entity:book"
  | "urn:entity:place"
  | "urn:entity:brand";

/** The Qloo entity type behind each Cue domain. */
export const DOMAIN_URN: Readonly<Record<Domain, EntityUrn>> = {
  music: "urn:entity:artist",
  film: "urn:entity:movie",
  tv: "urn:entity:tv_show",
  book: "urn:entity:book",
  place: "urn:entity:place",
  brand: "urn:entity:brand",
};

export type EnvelopeStatus = "ok" | "empty" | "needs_input" | "partial" | "degraded" | "error";

export type ErrorCode =
  | "rate_limited"
  | "auth"
  | "unsupported_type"
  | "bad_param"
  | "schema"
  | "timeout"
  | "upstream"
  | "budget"
  | "unknown_id"
  /** The caller's `signal` fired: the wait or the request was abandoned. */
  | "aborted";

/** How a result was obtained. Never contains names or free text. */
export interface QlooProvenance {
  readonly endpoint: string;
  /**
   * Canonical key of the request parameters. It can hold the Hometown or ids;
   * the Person's first name never reaches Qloo, so it is never in here.
   */
  readonly paramsKey: string;
  readonly cached: boolean;
  readonly stale: boolean;
  readonly retries: number;
  readonly ms: number;
  /** True for fixture data: scores are illustrative (UX "fixture data" label). */
  readonly synthetic?: boolean;
}

/**
 * Every client call resolves to an Envelope and never throws.
 * `ok` and `empty` carry data (`empty` has an empty list); failures carry
 * `data: null` plus an `errorCode`.
 */
export interface Envelope<T> {
  readonly status: EnvelopeStatus;
  readonly data: T | null;
  readonly provenance: QlooProvenance;
  readonly hint?: string;
  readonly errorCode?: ErrorCode;
}

export interface QlooTag {
  readonly id: string;
  readonly name: string;
  /** Qloo affinity, 0..1, on tags that come from a fingerprint (`urn:tag`) request. */
  readonly affinity?: number;
}

/** A Qloo entity after boundary validation. Only entities of this shape reach the UI. */
export interface QlooEntity {
  readonly entityId: string;
  readonly name: string;
  readonly type: EntityUrn;
  readonly domain: Domain;
  readonly year?: number;
  /** One short line from Qloo, kept to tell look-alike entities apart. Absent when Qloo gave none. */
  readonly description?: string;
  /** An https URL on an allow-listed host, or null (the UI shows a monogram). */
  readonly imageUrl: string | null;
  readonly tags: readonly QlooTag[];
  /** Qloo affinity, 0..1, or null when Qloo did not report one. */
  readonly affinity: number | null;
  /** Per-Seed contribution scores keyed by Seed entity id. */
  readonly explainability: Readonly<Record<string, number>>;
}

/** What `/v2/insights` can be asked to return: Cue entities, or `urn:tag` for the taste fingerprint. */
export type InsightsType = EntityUrn | "urn:tag";

/**
 * Parameters for `/v2/insights` (PLAN section 5.1), named by meaning. The wire
 * names (`signal.interests.entities`, `filter.release_year.min`...) are mapped
 * in `wire.ts`. Build these with `buildInsightsParams`, not by hand.
 */
export interface InsightsParams {
  readonly filterType: InsightsType;
  /** `signal.interests.entities`: Seeds and Learned Favorites, in priority order. */
  readonly interests?: readonly string[];
  /** `signal.interests.tags`: confirmed cuisine tags, or the fingerprint tags of `expand_theme`. */
  readonly interestTags?: readonly string[];
  /** `filter.exclude.entities`. */
  readonly excludeEntities?: readonly string[];
  /** `filter.exclude.tags`. */
  readonly excludeTags?: readonly string[];
  /** `signal.demographics.age`. */
  readonly age?: string;
  /** `signal.location.query`: for music, the Hometown. */
  readonly locationQuery?: string;
  /** `filter.location.query`: for places, the Care Location (else the Hometown). */
  readonly filterLocationQuery?: string;
  /** `filter.release_year.min/max`: the effective Window for film, TV and books. */
  readonly releaseYear?: { readonly min: number; readonly max: number };
  /** `filter.price_level.max` (places). */
  readonly priceLevelMax?: number;
  /** `filter.results.entities`: re-rank exactly these entities. */
  readonly resultEntities?: readonly string[];
  /** `feature.explainability=true`: per-Seed contribution scores. */
  readonly explainability?: boolean;
  readonly take?: number;
}

/** Parameters for `/search`: a name to look up, among the given entity types. */
export interface SearchQuery {
  readonly query: string;
  readonly types: readonly EntityUrn[];
  readonly take?: number;
}

/** Parameters for `/v2/tags` (semantic search for a tag by meaning). */
export interface TagQuery {
  readonly query: string;
  readonly tagTypes?: readonly string[];
  readonly take?: number;
}

/** Who is spending a call: the server prefetch, or the agent's reserve (PLAN 5.3). */
export type BudgetKind = "prefetch" | "agent";

export interface CallBudget {
  /**
   * Spends one call. False once that kind is spent: the call must return
   * `error:'budget'` without any HTTP request. Prefetch can never draw on the agent reserve.
   */
  take(kind: BudgetKind): boolean;
  /** Calls still available to `kind`. */
  remaining(kind: BudgetKind): number;
  /** Calls spent so far, by kind (for the trace and the request log). */
  used(): { readonly prefetch: number; readonly agent: number };
}

export interface CallOpts {
  readonly signal?: AbortSignal;
  readonly budget?: CallBudget;
  /** Which part of the budget this call spends. Defaults to `prefetch`. */
  readonly budgetKind?: BudgetKind;
}

/** What `insights` returns: Cue entities, or tags for a `urn:tag` (fingerprint) request. */
export interface InsightsResult {
  readonly entities: readonly QlooEntity[];
  readonly tags?: readonly QlooTag[];
}

/** The one Qloo seam. Implemented by the fixture client and the HTTP client (ADR 0002). */
export interface QlooClient {
  /** `/search`: candidates for a typed name. Matches are candidates only; confirm them (`resolveSeed`). */
  search(query: SearchQuery, opts?: CallOpts): Promise<Envelope<readonly QlooEntity[]>>;
  /** `/v2/tags`: tags whose meaning is close to a topic. */
  tags(query: TagQuery, opts?: CallOpts): Promise<Envelope<readonly QlooTag[]>>;
  /** `/v2/insights`: affinity-ranked Cues (or fingerprint tags). Never throws. */
  insights(params: InsightsParams, opts?: CallOpts): Promise<Envelope<InsightsResult>>;
}
