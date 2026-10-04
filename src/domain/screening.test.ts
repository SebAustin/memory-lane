import { describe, expect, it } from "vitest";
import { matchingAvoidTopic, screenByAvoidTopics } from "@/domain/screening";

const named = (...names: string[]) => names.map((name) => ({ name }));

describe("matchingAvoidTopic (PLAN section 14.1)", () => {
  it("matches an Avoid topic inside an entity name, ignoring case", () => {
    expect(matchingAvoidTopic("Tennessee Waltz Revue", ["Tennessee Waltz"])).toBe("Tennessee Waltz");
    expect(matchingAvoidTopic("tennessee waltz", ["Tennessee Waltz"])).toBe("Tennessee Waltz");
    expect(matchingAvoidTopic("THE TENNESSEE WALTZ!", ["tennessee waltz"])).toBe("tennessee waltz");
  });

  it("matches whole words only: a topic never fires inside a longer word", () => {
    expect(matchingAvoidTopic("Warren Zevon", ["war"])).toBeUndefined();
    expect(matchingAvoidTopic("Hayward Sisters", ["war"])).toBeUndefined();
    expect(matchingAvoidTopic("Tennessee Ernie Ford", ["Tennessee Waltz"])).toBeUndefined();
    expect(matchingAvoidTopic("Waltz Across Texas", ["Tennessee Waltz"])).toBeUndefined();
  });

  it("matches the words in order and side by side", () => {
    expect(matchingAvoidTopic("Waltz of Tennessee", ["Tennessee Waltz"])).toBeUndefined();
    expect(matchingAvoidTopic("Tennessee Sunday Waltz", ["Tennessee Waltz"])).toBeUndefined();
  });

  it("treats a plural and its singular as the same word (EVALS d: hospitals vs General Hospital)", () => {
    expect(matchingAvoidTopic("General Hospital", ["hospitals"])).toBe("hospitals");
    expect(matchingAvoidTopic("St. Jude Hospitals Choir", ["Hospital"])).toBe("Hospital");
  });

  it("does not stem short words or double-s words into false matches", () => {
    expect(matchingAvoidTopic("The Bus", ["bu"])).toBeUndefined();
    expect(matchingAvoidTopic("Glass Onion", ["glas"])).toBeUndefined();
    expect(matchingAvoidTopic("Glass Onion", ["glass"])).toBe("glass");
  });

  it("ignores accents and punctuation", () => {
    expect(matchingAvoidTopic("Café Tacvba", ["cafe tacvba"])).toBe("cafe tacvba");
    expect(matchingAvoidTopic("Vietnam-War: Blues", ["Vietnam War"])).toBe("Vietnam War");
    expect(matchingAvoidTopic("José Feliciano", ["jose"])).toBe("jose");
  });

  it("returns the first topic that matches", () => {
    expect(matchingAvoidTopic("War Hospital", ["hospital", "war"])).toBe("hospital");
  });

  it("ignores blank and punctuation-only topics instead of matching everything", () => {
    expect(matchingAvoidTopic("Anything", ["", "   ", "--"])).toBeUndefined();
    expect(matchingAvoidTopic("Anything", [])).toBeUndefined();
  });
});

describe("screenByAvoidTopics", () => {
  it("drops entities whose name matches a topic and reports which topic did it", () => {
    const result = screenByAvoidTopics(
      named("Loretta Lynn", "Tennessee Waltz Revue", "Brenda Lee"),
      ["Vietnam War", "Tennessee Waltz"],
    );

    expect(result.kept).toEqual(named("Loretta Lynn", "Brenda Lee"));
    expect(result.dropped).toEqual([
      { item: { name: "Tennessee Waltz Revue" }, topic: "Tennessee Waltz" },
    ]);
  });

  it("keeps everything, in order, when nothing matches", () => {
    const items = named("A", "B", "C");
    const result = screenByAvoidTopics(items, ["Vietnam War"]);

    expect(result.kept).toEqual(items);
    expect(result.dropped).toEqual([]);
  });

  it("keeps the other fields of an item untouched and does not mutate its input", () => {
    const items = Object.freeze([
      Object.freeze({ name: "General Hospital", entityId: "tv-1" }),
      Object.freeze({ name: "Doris Day Show", entityId: "tv-2" }),
    ]);

    const result = screenByAvoidTopics(items, ["hospitals"]);

    expect(result.kept).toEqual([{ name: "Doris Day Show", entityId: "tv-2" }]);
    expect(result.dropped[0]?.item.entityId).toBe("tv-1");
    expect(items).toHaveLength(2);
  });
});
