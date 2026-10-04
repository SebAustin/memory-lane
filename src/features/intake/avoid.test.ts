import { describe, expect, it } from "vitest";
import type { AvoidItem } from "@/contracts";
import { avoidKey, avoidName, avoidOutcome, planTopic } from "./avoid";

const topic = (text: string): AvoidItem => ({ kind: "topic", text });
const tag: AvoidItem = { kind: "tag", tagId: "fx-tag-war-films", name: "War films" };
const entity: AvoidItem = { kind: "entity", entityId: "fx-film-apocalypse-now", name: "Apocalypse Now", domain: "film" };

describe("how each Avoid List item is described (FR-5, UX section 3)", () => {
  it("names and keys every kind of item", () => {
    expect([topic("hospitals"), tag, entity].map(avoidName)).toEqual(["hospitals", "War films", "Apocalypse Now"]);
    expect(new Set([topic("hospitals"), tag, entity].map(avoidKey)).size).toBe(3);
  });

  it("says a tag match is matched to a Qloo tag", () => {
    expect(avoidOutcome(tag)).toBe("Matched to a Qloo tag: War films");
  });

  it("says a plain topic only guides Prompts", () => {
    expect(avoidOutcome(topic("hospitals"))).toBe("We'll keep this out of conversation Prompts");
  });

  it("says an entity is left out by Qloo as well as by name", () => {
    expect(avoidOutcome(entity)).toBe("Left out of every Kit, by Qloo and by name");
  });
});

describe("planTopic: what adding a topic does", () => {
  it("adds a matched tag and says which one", () => {
    const plan = planTopic({ kind: "tag", tag: { id: "fx-tag-war-films", name: "War films" } }, "war films", []);

    expect(plan.item).toEqual(tag);
    expect(plan.message).toBe("'war films' matched a Qloo tag: War films.");
  });

  it("adds an unmatched topic as Prompt guidance, trimmed", () => {
    const plan = planTopic({ kind: "topic", reachedQloo: true }, " hospitals ", []);

    expect(plan.item).toEqual(topic("hospitals"));
    expect(plan.message).toBe("We'll keep 'hospitals' out of conversation Prompts.");
  });

  it("still adds the topic when Qloo cannot be reached, and says so", () => {
    const plan = planTopic({ kind: "topic", reachedQloo: false }, "hospitals", []);

    expect(plan.item).toEqual(topic("hospitals"));
    expect(plan.message).toBe("We couldn't reach Qloo, so 'hospitals' will only be kept out of conversation Prompts.");
  });

  it("does not add a topic twice, whatever its case", () => {
    const plan = planTopic({ kind: "topic", reachedQloo: true }, "Hospitals", [topic("hospitals")]);

    expect(plan.item).toBeUndefined();
    expect(plan.message).toBe("'Hospitals' is already on the list.");
  });

  it("does not add a tag already on the list, or a topic that repeats a tag's name", () => {
    expect(planTopic({ kind: "tag", tag: { id: "fx-tag-war-films", name: "War films" } }, "war films", [tag]).item).toBeUndefined();
    expect(planTopic({ kind: "topic", reachedQloo: true }, "war films", [tag]).item).toBeUndefined();
  });
});
