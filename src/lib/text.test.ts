import { describe, expect, it } from "vitest";
import { fillName } from "@/lib/text";

describe("fillName", () => {
  it("replaces every {name} placeholder", () => {
    expect(fillName("Loved by people like {name}. Ask {name} about it.", "Margaret")).toBe(
      "Loved by people like Margaret. Ask Margaret about it.",
    );
  });

  it("keeps possessives intact", () => {
    expect(fillName("{name}'s era", "Margaret")).toBe("Margaret's era");
  });

  it("leaves text without a placeholder untouched", () => {
    expect(fillName("No placeholder here.", "Margaret")).toBe("No placeholder here.");
  });

  it("treats the name as plain text, not as a replacement pattern", () => {
    expect(fillName("Hi {name}", "$& $1 $$")).toBe("Hi $& $1 $$");
  });
});
