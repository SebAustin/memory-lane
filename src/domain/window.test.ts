import { describe, expect, it } from "vitest";
import { AGE_BUCKET, effectiveWindow, reminiscenceWindow } from "@/domain/window";

describe("reminiscenceWindow", () => {
  it("spans ages 10 to 30 for someone born in 1946", () => {
    expect(reminiscenceWindow(1946)).toEqual({
      start: 1956,
      end: 1976,
      label: "1956 to 1976",
    });
  });

  it("handles the earliest supported birth year, 1920", () => {
    expect(reminiscenceWindow(1920)).toEqual({ start: 1930, end: 1950, label: "1930 to 1950" });
  });

  it("handles the latest supported birth year, 1975", () => {
    expect(reminiscenceWindow(1975)).toEqual({ start: 1985, end: 2005, label: "1985 to 2005" });
  });

  it.each([1919, 1976, 1946.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects the unsupported birth year %s",
    (year) => {
      expect(() => reminiscenceWindow(year)).toThrow(RangeError);
    },
  );

  it("returns a frozen value so callers cannot mutate a shared Window", () => {
    const window = reminiscenceWindow(1946);
    expect(Object.isFrozen(window)).toBe(true);
  });
});

describe("effectiveWindow", () => {
  it("returns the original Window when the Caregiver has not widened", () => {
    const original = reminiscenceWindow(1946);
    expect(effectiveWindow(original, false)).toEqual(original);
  });

  it("extends both ends by 3 years when widened, leaving the original untouched", () => {
    const original = reminiscenceWindow(1946);
    expect(effectiveWindow(original, true)).toEqual({ start: 1953, end: 1979, label: "1953 to 1979" });
    expect(original).toEqual({ start: 1956, end: 1976, label: "1956 to 1976" });
  });
});

describe("AGE_BUCKET", () => {
  it("is the 55 and older cohort (FR-7)", () => {
    expect(AGE_BUCKET).toBe("55_and_older");
  });
});
