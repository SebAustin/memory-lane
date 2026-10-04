// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createRepository } from "./repository";
import { defaultStorage } from "./storage";

describe("NFR-10: the store sets no cookies", () => {
  it("leaves document.cookie empty after loading and saving", async () => {
    const repo = createRepository(defaultStorage(), []);
    await repo.load();

    await repo.saveDraft({ step: 2, values: { firstName: "Margaret" }, updatedAt: "2026-10-03T12:00:00.000Z" });

    expect(document.cookie).toBe("");
    expect(repo.getStatus().storage).toBe("indexeddb");
  });
});
