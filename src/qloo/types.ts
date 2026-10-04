import "server-only";
import type { Domain } from "@/contracts";

export type { Domain } from "@/contracts";

/**
 * Qloo seam types (PLAN section 3.1). This is the minimal slice that ticket 02
 * needs: insights only. Tickets 04-06 add `search`, `tags`, `compare`, the
 * HTTP client, caching and the full fixture semantics.
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
  | "unknown_id";

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
}

/** A Qloo entity after boundary validation. Only entities of this shape reach the UI. */
export interface QlooEntity {
  readonly entityId: string;
  readonly name: string;
  readonly type: EntityUrn;
  readonly domain: Domain;
  readonly year?: number;
  /** An https URL on an allow-listed host, or null (the UI shows a monogram). */
  readonly imageUrl: string | null;
  readonly tags: readonly QlooTag[];
  /** Qloo affinity, 0..1, or null when Qloo did not report one. */
  readonly affinity: number | null;
  /** Per-Seed contribution scores keyed by Seed entity id. */
  readonly explainability: Readonly<Record<string, number>>;
}

/** Parameters for `/v2/insights` (PLAN section 5.1). */
export interface InsightsParams {
  readonly filterType: EntityUrn;
  /** `signal.interests.entities`: Seeds and Learned Favorites. */
  readonly interests?: readonly string[];
  readonly excludeEntities?: readonly string[];
  readonly excludeTags?: readonly string[];
  /** `signal.demographics.age`. */
  readonly age?: string;
  /** `signal.location.query`: for music, the Hometown. */
  readonly locationQuery?: string;
  /** `filter.release_year.min/max`: the Reminiscence Window for film, TV and books. */
  readonly releaseYear?: { readonly min: number; readonly max: number };
  readonly take?: number;
}

export interface CallBudget {
  /** False once the budget is spent: the call must return `error:'budget'` without any HTTP request. */
  take(kind: "prefetch" | "agent"): boolean;
}

export interface CallOpts {
  readonly signal?: AbortSignal;
  readonly budget?: CallBudget;
}

/** The one Qloo seam. Implemented by the fixture client now and an HTTP client later (ADR 0002). */
export interface QlooClient {
  insights(
    params: InsightsParams,
    opts?: CallOpts,
  ): Promise<Envelope<{ readonly entities: readonly QlooEntity[] }>>;
}
