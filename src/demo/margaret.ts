import { KitRequest as KitRequestSchema } from "@/contracts";
import type { KitRequest, LifeStory, LifeStoryDigest, TasteProfile } from "@/contracts";
import { deepFreeze } from "@/lib/deep-freeze";

/**
 * The public Demo Person P1, "Margaret, b. 1946, Memphis" (FR-1). One click on
 * the landing page opens her Kit with no signup and no keys. Seeding her into
 * the browser store comes in ticket 15; until then the Kit page reads this constant.
 *
 * Seed ids are `fx-` fixture ids; ticket K replaces them with recorded Qloo ids.
 */

export const MARGARET_STORY_ID = "demo-margaret" as const;

export const MARGARET: LifeStory = deepFreeze({
  id: MARGARET_STORY_ID,
  firstName: "Margaret",
  birthYear: 1946,
  hometown: "Memphis",
  seeds: [
    {
      entityId: "fx-artist-patsy-cline",
      name: "Patsy Cline",
      domain: "music",
      imageUrl: null,
    },
    {
      entityId: "fx-film-pillow-talk",
      name: "Pillow Talk",
      domain: "film",
      year: 1959,
      imageUrl: null,
    },
    {
      entityId: "fx-film-move-over-darling",
      name: "Move Over, Darling",
      domain: "film",
      year: 1963,
      imageUrl: null,
    },
  ],
  avoidList: [
    { kind: "topic", text: "Vietnam War" },
    { kind: "topic", text: "Tennessee Waltz" },
  ],
  dementiaStage: "middle",
  sensitiveThemesOptIn: false,
  createdAt: "2026-10-03T00:00:00.000Z",
});

/** What would leave the device for Margaret: no first name anywhere (ADR 0001). */
export const MARGARET_DIGEST: LifeStoryDigest = deepFreeze({
  birthYear: MARGARET.birthYear,
  hometown: MARGARET.hometown,
  dementiaStage: MARGARET.dementiaStage,
  sensitiveThemesOptIn: MARGARET.sensitiveThemesOptIn,
  seeds: MARGARET.seeds.map(({ entityId, name }) => ({ entityId, name })),
  avoidTopics: MARGARET.avoidList.flatMap((item) => (item.kind === "topic" ? [item.text] : [])),
});

/** Margaret's starting Taste Profile: her Seeds, no Learned Favorites, no Exclusions yet. */
export const MARGARET_PROFILE: TasteProfile = deepFreeze({
  version: 0,
  seeds: MARGARET.seeds.map(({ entityId, name }) => ({ entityId, name })),
  learnedFavorites: [],
  exclusions: [],
  avoidTopics: [...MARGARET_DIGEST.avoidTopics],
});

/** A fresh, validated `/api/kit` request for Margaret's first Kit. */
export function margaretKitRequest(): KitRequest {
  return KitRequestSchema.parse({
    storyId: MARGARET_STORY_ID,
    digest: MARGARET_DIGEST,
    profile: MARGARET_PROFILE,
    generation: 1,
  });
}
