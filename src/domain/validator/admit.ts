/**
 * Steps 1-3 of `validateKit`, as one reusable verdict: may this registry
 * entity appear as a Cue? Novelty swaps and backfill reuse it, so a Cue they
 * add is re-checked against grounding, Exclusions and name screening (PLAN
 * section 3.2, "re-checked against steps 2-4").
 */
import { SENSITIVE_TERMS } from "@/domain/lexicons";
import { matchingAvoidTopic } from "@/domain/screening";
import { effectiveWindow } from "@/domain/window";
import type { Domain } from "@/contracts";
import type { DropReason, DropStep, RegistryEntry, ValidationContext } from "@/domain/validator/types";

export type Verdict =
  | { readonly ok: true; readonly entry: RegistryEntry }
  | { readonly ok: false; readonly step: DropStep; readonly reason: DropReason };

export interface Admission {
  readonly byId: ReadonlyMap<string, RegistryEntry>;
  verdict(entityId: string): Verdict;
  /** True for an admitted Cue inside a widened Window but outside the ORIGINAL one (R2). */
  isOutsideOriginalWindow(entry: RegistryEntry): boolean;
}

/** Domains whose Cues carry a release year and are gated by the Window. Artists, places and brands are not. */
const WINDOW_GATED: ReadonlySet<Domain> = new Set<Domain>(["film", "tv", "book"]);

const refuse = (step: DropStep, reason: DropReason): Verdict => ({ ok: false, step, reason });

/** Builds the verdict function for one run. Pure: all state is derived from `ctx`. */
export function createAdmission(ctx: ValidationContext): Admission {
  const byId = new Map(ctx.registry.map((entry) => [entry.entityId, entry]));
  const excluded = (kind: "entity" | "tag") =>
    new Set(ctx.profile.exclusions.filter((e) => e.kind === kind).map((e) => e.id));
  const excludedEntities = excluded("entity");
  const excludedTags = excluded("tag");
  const echoed = new Set([
    ...ctx.profile.seeds.map((seed) => seed.entityId),
    ...ctx.profile.learnedFavorites.map((favorite) => favorite.entityId),
  ]);

  const screenName = (entry: RegistryEntry): Verdict | undefined => {
    if (matchingAvoidTopic(entry.name, ctx.profile.avoidTopics) !== undefined) {
      return refuse("screening", "avoid_topic_name");
    }
    if (!ctx.sensitiveThemesOptIn && matchingAvoidTopic(entry.name, SENSITIVE_TERMS) !== undefined) {
      return refuse("screening", "sensitive_name");
    }
    return undefined;
  };

  const windowFor = (entry: RegistryEntry) =>
    effectiveWindow(ctx.window, ctx.widened.some((domain) => domain === entry.domain));

  const screenWindow = (entry: RegistryEntry): Verdict | undefined => {
    if (!WINDOW_GATED.has(entry.domain)) return undefined;
    if (entry.year === undefined) return refuse("window", "missing_year");
    const { start, end } = windowFor(entry);
    return entry.year < start || entry.year > end ? refuse("window", "outside_window") : undefined;
  };

  const isOutsideOriginalWindow = (entry: RegistryEntry): boolean =>
    WINDOW_GATED.has(entry.domain) &&
    entry.year !== undefined &&
    (entry.year < ctx.window.start || entry.year > ctx.window.end);

  const verdict = (entityId: string): Verdict => {
    const entry = byId.get(entityId);
    if (entry === undefined) return refuse("grounding", "not_in_registry");
    if (excludedEntities.has(entityId)) return refuse("exclusions", "excluded_entity");
    if (entry.tags.some((tag) => excludedTags.has(tag.id))) return refuse("exclusions", "excluded_tag");
    if (echoed.has(entityId)) return refuse("exclusions", "seed_or_favorite_echo");
    return screenName(entry) ?? screenWindow(entry) ?? { ok: true, entry };
  };

  return { byId, verdict, isOutsideOriginalWindow };
}
