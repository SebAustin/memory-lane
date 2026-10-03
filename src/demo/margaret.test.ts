import { describe, expect, it } from "vitest";
import { KitRequest, LifeStory, LifeStoryDigest, TasteProfile } from "@/contracts";
import {
  MARGARET,
  MARGARET_DIGEST,
  MARGARET_PROFILE,
  margaretKitRequest,
} from "@/demo/margaret";
import { reminiscenceWindow } from "@/domain/window";

describe("the Margaret demo persona (P1)", () => {
  it("is a valid Life Story with the public demo id", () => {
    const parsed = LifeStory.parse(MARGARET);
    expect(parsed.id).toBe("demo-margaret");
  });

  it("matches the persona in the brief: b. 1946, Memphis, Middle stage", () => {
    expect(MARGARET).toMatchObject({
      firstName: "Margaret",
      birthYear: 1946,
      hometown: "Memphis",
      dementiaStage: "middle",
    });
    expect(reminiscenceWindow(MARGARET.birthYear).label).toBe("1956 to 1976");
  });

  it("has Patsy Cline and Doris Day films as Seeds", () => {
    const names = MARGARET.seeds.map((seed) => seed.name);
    expect(names).toContain("Patsy Cline");
    expect(names).toContain("Pillow Talk");
    expect(MARGARET.seeds.every((seed) => seed.entityId.startsWith("fx-"))).toBe(true);
  });

  it("keeps Vietnam War and 'Tennessee Waltz' on the Avoid List", () => {
    const topics = MARGARET.avoidList.flatMap((item) => (item.kind === "topic" ? [item.text] : []));
    expect(topics).toEqual(["Vietnam War", "Tennessee Waltz"]);
  });

  it("is immutable, all the way down", () => {
    expect(Object.isFrozen(MARGARET)).toBe(true);
    expect(Object.isFrozen(MARGARET.seeds)).toBe(true);
    expect(Object.isFrozen(MARGARET.seeds[0])).toBe(true);
    expect(() => {
      (MARGARET.seeds as unknown as unknown[]).push({});
    }).toThrow(TypeError);
  });
});

describe("what leaves the device for Margaret", () => {
  it("has a digest without her first name", () => {
    expect(LifeStoryDigest.safeParse(MARGARET_DIGEST).success).toBe(true);
    expect(JSON.stringify(MARGARET_DIGEST)).not.toContain("Margaret");
    expect(MARGARET_DIGEST.seedNames).toEqual(MARGARET.seeds.map((seed) => seed.name));
  });

  it("has a Taste Profile built from her Seeds and Avoid topics", () => {
    expect(TasteProfile.safeParse(MARGARET_PROFILE).success).toBe(true);
    expect(MARGARET_PROFILE.seedIds).toEqual(MARGARET.seeds.map((seed) => seed.entityId));
    expect(MARGARET_PROFILE.avoidTopics).toEqual(["Vietnam War", "Tennessee Waltz"]);
  });

  it("builds a valid, strict Kit request for generation 1", () => {
    const request = margaretKitRequest();
    const parsed = KitRequest.parse(request);
    expect(parsed.storyId).toBe("demo-margaret");
    expect(parsed.generation).toBe(1);
    expect(JSON.stringify(request)).not.toContain("Margaret");
  });

  it("returns a fresh request each time so callers cannot share state", () => {
    expect(margaretKitRequest()).not.toBe(margaretKitRequest());
  });
});
