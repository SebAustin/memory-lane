import { afterEach, describe, expect, it, vi } from "vitest";
import { StoryId } from "@/contracts";
import { newStoryId } from "./id";

afterEach(() => vi.unstubAllGlobals());

describe("newStoryId", () => {
  it("makes a uuid the StoryId contract accepts", () => {
    expect(StoryId.safeParse(newStoryId()).success).toBe(true);
  });

  it("makes a different id every time", () => {
    expect(newStoryId()).not.toBe(newStoryId());
  });

  it("still makes a valid uuid where crypto.randomUUID is missing (plain-http pages)", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: real.getRandomValues.bind(real) });

    const id = newStoryId();

    expect(StoryId.safeParse(id).success).toBe(true);
    expect(id[14]).toBe("4");
  });
});
