import { describe, expect, it } from "vitest";
import { deepFreeze } from "@/lib/deep-freeze";

describe("deepFreeze", () => {
  it("freezes nested objects and arrays and returns the same reference", () => {
    const value = { a: { b: [{ c: 1 }] } };
    const frozen = deepFreeze(value);

    expect(frozen).toBe(value);
    expect(Object.isFrozen(value.a)).toBe(true);
    expect(Object.isFrozen(value.a.b)).toBe(true);
    expect(Object.isFrozen(value.a.b[0])).toBe(true);
  });

  it("leaves primitives and null alone", () => {
    expect(deepFreeze(3)).toBe(3);
    expect(deepFreeze(null)).toBeNull();
    expect(deepFreeze("x")).toBe("x");
  });

  it("copes with a value that is already frozen", () => {
    const inner = Object.freeze({ x: 1 });
    expect(() => deepFreeze({ inner })).not.toThrow();
  });
});
