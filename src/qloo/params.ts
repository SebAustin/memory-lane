import "server-only";
import type { Domain, KitRequest, Stage } from "@/contracts";
import type { ProfileSignals } from "@/domain/profile";
import { AGE_BUCKET, effectiveWindow, type ReminiscenceWindow } from "@/domain/window";
import { DOMAIN_URN, type InsightsParams } from "./types";

/**
 * Builds the `/v2/insights` request for each kind of ask (PLAN 5.1). Pure and
 * deterministic: the same Life Story context always gives the same request,
 * so it caches, snapshots and replays. The model never reaches this code with
 * free text: it can only pick ids that the caller has already checked.
 */

/** Cue domains the Caregiver can widen by 3 years (film, TV and books). */
export type WidenedDomain = KitRequest["widen"][number];

/**
 * What the server binds to every Qloo call. It is rebuilt on the server from
 * `birthYear` and the Taste Profile (never trusted from the model), so the
 * Window, location and Exclusions cannot be steered by generated text.
 */
export interface BoundContext {
  /** The ORIGINAL Reminiscence Window. Widening is read from `widened`. */
  readonly window: ReminiscenceWindow;
  readonly widened: readonly WidenedDomain[];
  readonly ageBucket: typeof AGE_BUCKET;
  readonly hometown: string;
  readonly careLocation?: string;
  readonly signals: ProfileSignals;
  readonly stage: Stage;
  /** Cue ids shown in the previous Kit, for the novelty rule. */
  readonly previousCueIds: readonly string[];
}

export type CueRequest =
  /** A domain's Cues for the Seeds (prefetch, and the ladder's relaxed retries). */
  | {
      readonly kind: "cues";
      readonly domain: Domain;
      /** Confirmed cuisine tags, the signal for places. Pass `[]` to drop them (ladder step 1). */
      readonly cuisineTagIds?: readonly string[];
      /** Use only the first N interests (ladder step 2: the top 2 Seeds). */
      readonly topInterests?: number;
    }
  /** The taste fingerprint: the tags the Seeds share. */
  | { readonly kind: "fingerprint" }
  /** The agent's `expand_theme`: a domain by fingerprint tags instead of Seeds. */
  | {
      readonly kind: "expand_theme";
      readonly domain: Domain;
      readonly tagIds: readonly string[];
      readonly take?: number;
    }
  /** The agent's `rerank_cues`: re-score a shortlist the model chose from the registry. */
  | { readonly kind: "rerank"; readonly domain: Domain; readonly entityIds: readonly string[] };

/**
 * Details that only the Qloo key can settle (PLAN 5.1, [QLOO-GATED]). The
 * defaults are the plan's; slice K flips them from what the live smoke test finds.
 * Per-entity weights default to ordering plus the 10-id cap, so there is no
 * weight option yet.
 */
export interface ParamOptions {
  /** Whether books honour `filter.release_year`. If Qloo ignores it, era is reported, not gated. */
  readonly bookReleaseYear: boolean;
}

export const DEFAULT_PARAM_OPTIONS: ParamOptions = { bookReleaseYear: true };

export const CUE_TAKE = 15;
export const PLACE_TAKE = 10;
export const FINGERPRINT_TAKE = 20;
export const EXPAND_TAKE_MIN = 5;
export const EXPAND_TAKE_MAX = 10;
/** Qloo's cap on `take` for `/v2/insights`. */
export const MAX_TAKE = 50;
const MAX_EXPAND_TAGS = 3;
const MAX_RERANK_IDS = 20;
const PLACE_PRICE_LEVEL_MAX = 3;

/** Domains whose Cues carry a release year and so are gated by the Window. */
const WINDOWED: ReadonlySet<Domain> = new Set<Domain>(["film", "tv", "book"]);

const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Exclusions and explainability: sent on every call, whatever it asks for. */
function common(bound: BoundContext): Pick<InsightsParams, "excludeEntities" | "excludeTags" | "explainability"> {
  return {
    excludeEntities: bound.signals.excludeEntities,
    excludeTags: bound.signals.excludeTags,
    explainability: true,
  };
}

/** What a domain's request needs apart from its signal (Seeds or tags) and `take`. */
function domainBase(domain: Domain, bound: BoundContext, options: ParamOptions): InsightsParams {
  const base: InsightsParams = { filterType: DOMAIN_URN[domain], ...common(bound) };
  switch (domain) {
    case "music":
      return { ...base, age: bound.ageBucket, locationQuery: bound.hometown };
    case "place":
      return {
        ...base,
        filterLocationQuery: bound.careLocation ?? bound.hometown,
        priceLevelMax: PLACE_PRICE_LEVEL_MAX,
      };
    case "brand":
      return { ...base, age: bound.ageBucket };
    case "film":
    case "tv":
    case "book": {
      const withAge = { ...base, age: bound.ageBucket };
      if (domain === "book" && !options.bookReleaseYear) return withAge;
      const window = effectiveWindow(bound.window, bound.widened.includes(domain as WidenedDomain));
      return { ...withAge, releaseYear: { min: window.start, max: window.end } };
    }
  }
}

const interestsOf = (bound: BoundContext, limit?: number): string[] =>
  bound.signals.interests.slice(0, limit).map((interest) => interest.entityId);

/** The Cue request for a domain: Seeds (not for places, whose signal is cuisine tags) plus `take`. */
function cuesParams(
  request: Extract<CueRequest, { kind: "cues" }>,
  bound: BoundContext,
  options: ParamOptions,
): InsightsParams {
  const { domain, cuisineTagIds = [], topInterests } = request;
  const base = domainBase(domain, bound, options);
  if (domain === "place") {
    return {
      ...base,
      ...(cuisineTagIds.length > 0 ? { interestTags: unique(cuisineTagIds) } : {}),
      take: PLACE_TAKE,
    };
  }
  const interests = interestsOf(bound, topInterests);
  return { ...base, ...(interests.length > 0 ? { interests } : {}), take: CUE_TAKE };
}

/**
 * The `/v2/insights` request for `request`, bound to `bound` (PLAN 5.1).
 * Every request carries the Exclusions (plus the sensitive-theme tags unless
 * the Caregiver opted in: `bound.signals` is built by `toSignals`),
 * `feature.explainability`, and `take` of 15 (places 10, fingerprint 20).
 * Film, TV and books use the EFFECTIVE Window: the original, widened by 3
 * years only for a domain the Caregiver widened.
 */
export function buildInsightsParams(
  request: CueRequest,
  bound: BoundContext,
  options: ParamOptions = DEFAULT_PARAM_OPTIONS,
): InsightsParams {
  switch (request.kind) {
    case "cues":
      return cuesParams(request, bound, options);
    case "fingerprint": {
      const interests = interestsOf(bound);
      return {
        filterType: "urn:tag",
        ...(interests.length > 0 ? { interests } : {}),
        take: FINGERPRINT_TAKE,
        ...common(bound),
      };
    }
    case "expand_theme":
      return {
        ...domainBase(request.domain, bound, options),
        age: bound.ageBucket,
        interestTags: unique(request.tagIds).slice(0, MAX_EXPAND_TAGS),
        take: clamp(request.take ?? EXPAND_TAKE_MAX, EXPAND_TAKE_MIN, EXPAND_TAKE_MAX),
      };
    case "rerank":
      return {
        ...cuesParams({ kind: "cues", domain: request.domain }, bound, options),
        resultEntities: unique(request.entityIds).slice(0, MAX_RERANK_IDS),
      };
  }
}

/** True for domains whose Cues are gated by the Reminiscence Window. */
export const isWindowedDomain = (domain: Domain): boolean => WINDOWED.has(domain);

/**
 * Why a request cannot be sent, or undefined when it can. Both clients answer
 * `error:'bad_param'` with no call at all (L4): a negative or fractional `take`
 * must not turn into a surprising slice, or a request Qloo would reject.
 */
export function validateInsightsParams(params: InsightsParams): string | undefined {
  const { take, releaseYear, resultEntities } = params;
  if (take !== undefined && (!Number.isInteger(take) || take < 1 || take > MAX_TAKE)) {
    return `take must be a whole number from 1 to ${MAX_TAKE}`;
  }
  if (
    releaseYear !== undefined &&
    (!Number.isInteger(releaseYear.min) || !Number.isInteger(releaseYear.max) || releaseYear.min > releaseYear.max)
  ) {
    return "release year must be a range of whole years, min <= max";
  }
  if (resultEntities !== undefined && resultEntities.length === 0) {
    return "filter.results.entities needs at least one entity id";
  }
  return undefined;
}
