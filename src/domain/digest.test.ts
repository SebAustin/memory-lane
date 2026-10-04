import { describe, expect, it } from "vitest";
import { LifeStoryDigest, type LifeStory } from "@/contracts";
import { MARGARET } from "@/demo/margaret";
import { scrubQuery, toDigest } from "./digest";

const story = (patch: Partial<LifeStory> = {}): LifeStory => ({ ...MARGARET, ...patch });

describe("toDigest (P6 privacy variant, EVALS (i))", () => {
  it("replaces the first name with {name} in free text, possessives included", () => {
    const digest = toDigest(story({ occupation: "Margaret's family bakery" }));

    expect(digest.occupation).toBe("{name}'s family bakery");
  });

  it("has no firstName key, no id and no createdAt, and passes the strict digest schema", () => {
    const digest = toDigest(story());

    expect(Object.keys(digest)).not.toContain("firstName");
    expect(Object.keys(digest)).not.toContain("id");
    expect(Object.keys(digest)).not.toContain("createdAt");
    expect(LifeStoryDigest.safeParse(digest).success).toBe(true);
  });

  it("never lets the name through in any string of the digest, whatever its case", () => {
    const digest = toDigest(
      story({
        hometown: "MARGARET Falls",
        careLocation: "margaret's Mill",
        heritage: "Irish, like Margaret",
        language: "Margaret's mother tongue",
        occupation: "Margaret's family bakery",
        seeds: MARGARET.seeds.map((seed, index) =>
          index === 0 ? { ...seed, name: "Margaret Whiting" } : seed,
        ),
        avoidList: [
          { kind: "topic", text: "Margaret's late husband" },
          { kind: "entity", entityId: "fx-1", name: "Margaret Mitchell", domain: "book" },
        ],
      }),
    );

    expect(JSON.stringify(digest).toLowerCase()).not.toContain("margaret");
    expect(digest.hometown).toBe("{name} Falls");
    expect(digest.seeds[0]?.name).toBe("{name} Whiting");
  });

  it("matches whole words only: Margarete and Margaretville are other words", () => {
    const digest = toDigest(story({ hometown: "Margaretville", occupation: "Margarete's bakery" }));

    expect(digest.hometown).toBe("Margaretville");
    expect(digest.occupation).toBe("Margarete's bakery");
  });

  it("handles accents, a decomposed spelling and a typographic apostrophe", () => {
    const decomposed = "José";
    const digest = toDigest(
      story({ firstName: "José", occupation: `${decomposed}’s JOSÉ bakery` }),
    );

    expect(digest.occupation).toBe("{name}’s {name} bakery");
  });

  it("replaces each part of a two-word name, and the whole name", () => {
    const digest = toDigest(
      story({ firstName: "Mary Ann", occupation: "Mary Ann's bakery", heritage: "Mary was Irish" }),
    );

    expect(digest.occupation).toBe("{name}'s bakery");
    expect(digest.heritage).toBe("{name} was Irish");
  });

  it("keeps Seeds as {entityId, name} pairs and lists every Avoid item by name", () => {
    const digest = toDigest(
      story({
        avoidList: [
          { kind: "topic", text: "Vietnam War" },
          { kind: "entity", entityId: "fx-film-apocalypse-now", name: "Apocalypse Now", domain: "film" },
          { kind: "tag", tagId: "fx-tag-war-films", name: "War films" },
        ],
      }),
    );

    expect(digest.seeds).toEqual([
      { entityId: "fx-artist-patsy-cline", name: "Patsy Cline" },
      { entityId: "fx-film-pillow-talk", name: "Pillow Talk" },
      { entityId: "fx-film-move-over-darling", name: "Move Over, Darling" },
    ]);
    expect(digest.avoidTopics).toEqual(["Vietnam War", "Apocalypse Now", "War films"]);
  });

  it("keeps an over-long Avoid name within the 60-character topic limit, cut at a word", () => {
    const long = "The Extraordinarily Long Winded Title of an Avoided Documentary Film";
    const digest = toDigest(
      story({ avoidList: [{ kind: "entity", entityId: "fx-2", name: long, domain: "film" }] }),
    );

    expect(digest.avoidTopics[0]!.length).toBeLessThanOrEqual(60);
    expect(long.startsWith(digest.avoidTopics[0]!)).toBe(true);
    expect(digest.avoidTopics[0]!.endsWith(" ")).toBe(false);
  });

  it("omits optional fields the Caregiver left out, and does not change the story", () => {
    const original = story();
    const before = JSON.stringify(original);

    const digest = toDigest(original);

    expect(Object.keys(digest)).not.toContain("youngAdultCity");
    expect(Object.keys(digest)).not.toContain("occupation");
    expect(JSON.stringify(original)).toBe(before);
  });
});

describe("scrubQuery", () => {
  it("removes the first name, and a possessive after it, from text bound for Qloo", () => {
    expect(scrubQuery("Margaret's favorite Patsy Cline song", "Margaret")).toBe("favorite Patsy Cline song");
    expect(scrubQuery("Patsy Cline for MARGARET", "Margaret")).toBe("Patsy Cline for");
  });

  it("collapses the gap the name leaves and trims", () => {
    expect(scrubQuery("  Pillow   Margaret   Talk ", "Margaret")).toBe("Pillow Talk");
  });

  it("leaves a different word that merely starts with the name", () => {
    expect(scrubQuery("Margarete Bourke-White", "Margaret")).toBe("Margarete Bourke-White");
  });

  it("returns the text unchanged (trimmed) when there is no name yet", () => {
    expect(scrubQuery(" Patsy Cline ", "")).toBe("Patsy Cline");
  });
});
