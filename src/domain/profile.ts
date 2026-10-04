import type { LifeStory, TasteProfile } from "@/contracts";
import { avoidTermsOf, NAME_PLACEHOLDER, replaceFirstName, seedRefOf } from "./digest";
import { SENSITIVE_TAG_IDS } from "./sensitiveTags";

/** Qloo accepts at most this many interests per request (NFR-11); extras are dropped, lowest weight first. */
export const MAX_INTERESTS = 10;

export type InterestWeight = "high" | "medium" | "low";

/** What a request to Qloo carries about taste: ids and weights only, never names. */
export interface ProfileSignals {
  readonly interests: ReadonlyArray<{ readonly entityId: string; readonly weight: InterestWeight }>;
  readonly excludeEntities: readonly string[];
  readonly excludeTags: readonly string[];
}

const FAVORITE_WEIGHT: Readonly<Record<1 | 2 | 3, InterestWeight>> = {
  3: "high",
  2: "medium",
  1: "low",
};

/**
 * A new Taste Profile for a Life Story: its Seeds, no Learned Favorites, and an
 * Exclusion for every Avoid entity and tag (topics only guide Prompts). It goes
 * to the server, so the first name is replaced the same way as in the digest.
 */
export function profileFromStory(story: LifeStory): TasteProfile {
  const { firstName } = story;
  return {
    version: 0,
    seeds: story.seeds.map((seed) => seedRefOf(seed, firstName)),
    learnedFavorites: [],
    exclusions: story.avoidList.flatMap((item) => {
      if (item.kind === "topic") return [];
      const label = replaceFirstName(item.name, firstName, NAME_PLACEHOLDER);
      return [
        item.kind === "entity"
          ? { kind: "entity" as const, id: item.entityId, label, source: "avoid" as const, addedAt: story.createdAt }
          : { kind: "tag" as const, id: item.tagId, label, source: "avoid" as const, addedAt: story.createdAt },
      ];
    }),
    avoidTopics: avoidTermsOf(story.avoidList, firstName),
  };
}

const unique = (ids: readonly string[]): string[] => [...new Set(ids)];

/**
 * The request signals for a profile: Seeds first (high), then Learned Favorites
 * by weight, capped at 10; Exclusions by kind, plus the sensitive-theme tags
 * unless the Caregiver opted in (PLAN 3.2, 5.1).
 */
export function toSignals(profile: TasteProfile, sensitiveOptIn: boolean): ProfileSignals {
  const seeds = profile.seeds.map(({ entityId }) => ({ entityId, weight: "high" as const }));
  const favorites = [...profile.learnedFavorites]
    .sort((a, b) => b.weight - a.weight)
    .map(({ entityId, weight }) => ({ entityId, weight: FAVORITE_WEIGHT[weight as 1 | 2 | 3] }));

  const excluded = (kind: "entity" | "tag"): string[] =>
    profile.exclusions.filter((exclusion) => exclusion.kind === kind).map((exclusion) => exclusion.id);

  return {
    interests: [...seeds, ...favorites].slice(0, MAX_INTERESTS),
    excludeEntities: unique(excluded("entity")),
    excludeTags: unique([...excluded("tag"), ...(sensitiveOptIn ? [] : SENSITIVE_TAG_IDS)]),
  };
}
