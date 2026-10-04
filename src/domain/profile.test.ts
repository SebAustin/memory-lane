import { describe, expect, it } from "vitest";
import { TasteProfile, type LifeStory } from "@/contracts";
import { MARGARET } from "@/demo/margaret";
import { profileFromStory, toSignals } from "./profile";
import { SENSITIVE_TAG_IDS } from "./sensitiveTags";

const story = (patch: Partial<LifeStory> = {}): LifeStory => ({ ...MARGARET, ...patch });

describe("profileFromStory", () => {
  it("starts a fresh Taste Profile from the Seeds, with no Learned Favorites", () => {
    const profile = profileFromStory(story());

    expect(TasteProfile.safeParse(profile).success).toBe(true);
    expect(profile.version).toBe(0);
    expect(profile.learnedFavorites).toEqual([]);
    expect(profile.seeds.map((seed) => seed.entityId)).toEqual([
      "fx-artist-patsy-cline",
      "fx-film-pillow-talk",
      "fx-film-move-over-darling",
    ]);
  });

  it("turns Avoid entities and tags into Exclusions, and topics only into guidance", () => {
    const profile = profileFromStory(
      story({
        avoidList: [
          { kind: "topic", text: "Vietnam War" },
          { kind: "entity", entityId: "fx-film-apocalypse-now", name: "Apocalypse Now", domain: "film" },
          { kind: "tag", tagId: "fx-tag-war-films", name: "War films" },
        ],
      }),
    );

    expect(profile.exclusions).toEqual([
      {
        kind: "entity",
        id: "fx-film-apocalypse-now",
        label: "Apocalypse Now",
        source: "avoid",
        addedAt: MARGARET.createdAt,
      },
      { kind: "tag", id: "fx-tag-war-films", label: "War films", source: "avoid", addedAt: MARGARET.createdAt },
    ]);
    expect(profile.avoidTopics).toEqual(["Vietnam War", "Apocalypse Now", "War films"]);
  });

  it("carries no first name anywhere, since a Taste Profile leaves the device", () => {
    const profile = profileFromStory(
      story({ avoidList: [{ kind: "topic", text: "Margaret's late husband" }] }),
    );

    expect(JSON.stringify(profile).toLowerCase()).not.toContain("margaret");
  });
});

describe("toSignals", () => {
  const favorite = (id: string, weight: 1 | 2 | 3) => ({
    entityId: id,
    name: id,
    domain: "music" as const,
    weight,
    fromSessionId: "s1",
  });

  it("puts Seeds first as high, then Learned Favorites by weight", () => {
    const base = profileFromStory(story());
    const signals = toSignals(
      { ...base, learnedFavorites: [favorite("lf-1", 1), favorite("lf-3", 3), favorite("lf-2", 2)] },
      false,
    );

    expect(signals.interests).toEqual([
      { entityId: "fx-artist-patsy-cline", weight: "high" },
      { entityId: "fx-film-pillow-talk", weight: "high" },
      { entityId: "fx-film-move-over-darling", weight: "high" },
      { entityId: "lf-3", weight: "high" },
      { entityId: "lf-2", weight: "medium" },
      { entityId: "lf-1", weight: "low" },
    ]);
  });

  it("caps interests at 10 by weight, so a Learned Favorite never pushes a Seed out (NFR-11)", () => {
    const seeds = ["a", "b", "c", "d", "e"].map((id) => ({ entityId: `seed-${id}`, name: id }));
    const learned = Array.from({ length: 8 }, (_, i) => favorite(`lf-${i}`, (1 + (i % 3)) as 1 | 2 | 3));

    const signals = toSignals({ ...profileFromStory(story()), seeds, learnedFavorites: learned }, false);

    expect(signals.interests).toHaveLength(10);
    expect(signals.interests.slice(0, 5).map((i) => i.entityId)).toEqual(seeds.map((s) => s.entityId));
    const learnedWeights = signals.interests.slice(5).map((i) => i.weight);
    expect(learnedWeights).toEqual([...learnedWeights].sort((a, b) => order(a) - order(b)));
  });

  it("excludes sensitive tags unless the Caregiver opted in", () => {
    const profile = profileFromStory(
      story({ avoidList: [{ kind: "tag", tagId: "fx-tag-war-films", name: "War films" }] }),
    );

    const off = toSignals(profile, false);
    const on = toSignals(profile, true);

    expect(off.excludeTags).toEqual(["fx-tag-war-films", ...SENSITIVE_TAG_IDS]);
    expect(on.excludeTags).toEqual(["fx-tag-war-films"]);
  });

  it("lists excluded entities, and never repeats an id", () => {
    const profile = profileFromStory(
      story({
        avoidList: [
          { kind: "entity", entityId: "fx-1", name: "One", domain: "film" },
          { kind: "tag", tagId: SENSITIVE_TAG_IDS[0]!, name: "Sensitive" },
        ],
      }),
    );

    const signals = toSignals(profile, false);

    expect(signals.excludeEntities).toEqual(["fx-1"]);
    expect(new Set(signals.excludeTags).size).toBe(signals.excludeTags.length);
  });
});

const order = (weight: "high" | "medium" | "low") => ({ high: 0, medium: 1, low: 2 })[weight];
