import { describe, expect, it } from "vitest";
import { cacheKey } from "@/qloo/cacheKey";

describe("cacheKey", () => {
  it("is a sha256 hex digest", () => {
    expect(cacheKey("/v2/insights", { "filter.type": "urn:entity:artist" })).toMatch(/^[0-9a-f]{64}$/);
  });

  it("does not depend on the order the params were written in", () => {
    const a = cacheKey("/v2/insights", { take: "15", "filter.type": "urn:entity:movie" });
    const b = cacheKey("/v2/insights", { "filter.type": "urn:entity:movie", take: "15" });
    expect(a).toBe(b);
  });

  it("differs by endpoint and by any param value", () => {
    const base = cacheKey("/v2/insights", { take: "15" });
    expect(cacheKey("/search", { take: "15" })).not.toBe(base);
    expect(cacheKey("/v2/insights", { take: "10" })).not.toBe(base);
    expect(cacheKey("/v2/insights", { take: "15", extra: "x" })).not.toBe(base);
  });

  it("cannot be confused by values that contain the separators", () => {
    expect(cacheKey("/search", { a: "1&b=2" })).not.toBe(cacheKey("/search", { a: "1", b: "2" }));
  });

  it("keeps the order of a list value, since interest order is priority", () => {
    expect(cacheKey("/v2/insights", { ids: "a,b" })).not.toBe(cacheKey("/v2/insights", { ids: "b,a" }));
  });

  it("is a hash, so a typed name can never be read back out of it", () => {
    const key = cacheKey("/search", { query: "Doris Day" });
    expect(key.toLowerCase()).not.toContain("doris");
  });
});
