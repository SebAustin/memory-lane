import { describe, expect, it } from "vitest";
import { isAllowedImageHost, normalizeEntity } from "@/qloo/normalize";

const HOSTS = ["images.qloo.example", "*.cdn.example"];

const raw = (properties: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
  entity_id: "fx-artist-1",
  name: "Patsy Cline",
  type: "urn:entity:artist",
  properties,
  tags: [{ tag_id: "t1", name: "Country", type: "urn:tag:genre:music" }],
  popularity: 0.75,
  query: { affinity: 0.89, explainability: { "fx-seed-1": 0.85 } },
  ...extra,
});

describe("normalizeEntity images", () => {
  it("accepts an image given as a plain string on an allow-listed host", () => {
    const entity = normalizeEntity(raw({ image: "https://images.qloo.example/a.jpg" }), HOSTS);
    expect(entity?.imageUrl).toBe("https://images.qloo.example/a.jpg");
  });

  it("accepts an image given as { url } on an allow-listed host", () => {
    const entity = normalizeEntity(
      raw({ image: { url: "https://images.qloo.example/a.jpg" } }),
      HOSTS,
    );
    expect(entity?.imageUrl).toBe("https://images.qloo.example/a.jpg");
  });

  it("matches wildcard hosts but not the bare parent domain", () => {
    expect(
      normalizeEntity(raw({ image: "https://a.cdn.example/x.jpg" }), HOSTS)?.imageUrl,
    ).toBe("https://a.cdn.example/x.jpg");
    expect(normalizeEntity(raw({ image: "https://cdn.example/x.jpg" }), HOSTS)?.imageUrl).toBeNull();
  });

  it("turns an image on a host that is not allow-listed into null (string form)", () => {
    const entity = normalizeEntity(raw({ image: "https://evil.example/a.jpg" }), HOSTS);
    expect(entity).not.toBeNull();
    expect(entity?.imageUrl).toBeNull();
  });

  it("turns an image on a host that is not allow-listed into null ({url} form)", () => {
    const entity = normalizeEntity(raw({ image: { url: "https://evil.example/a.jpg" } }), HOSTS);
    expect(entity?.imageUrl).toBeNull();
  });

  it("does not let a look-alike host slip past the allow-list", () => {
    for (const url of [
      "https://images.qloo.example.evil.com/a.jpg",
      "https://evilimages.qloo.example/a.jpg",
      "https://images.qloo.example@evil.com/a.jpg",
    ]) {
      expect(normalizeEntity(raw({ image: url }), HOSTS)?.imageUrl, url).toBeNull();
    }
  });

  it("rejects non-https schemes and malformed URLs", () => {
    for (const image of [
      "http://images.qloo.example/a.jpg",
      "javascript:alert(1)",
      "data:image/svg+xml,<svg/>",
      "//images.qloo.example/a.jpg",
      "not a url",
      "",
    ]) {
      expect(normalizeEntity(raw({ image }), HOSTS)?.imageUrl, image).toBeNull();
    }
  });

  it("falls back to null when the image is missing, null or of an unexpected shape", () => {
    for (const properties of [{}, { image: null }, { image: 42 }, { image: { url: 5 } }, { image: {} }]) {
      expect(normalizeEntity(raw(properties), HOSTS)?.imageUrl).toBeNull();
    }
  });

  it("allows no image at all when the allow-list is empty (monogram mode)", () => {
    const entity = normalizeEntity(raw({ image: "https://images.qloo.example/a.jpg" }), []);
    expect(entity?.imageUrl).toBeNull();
  });
});

describe("normalizeEntity fields", () => {
  it("maps a raw Qloo artist to a QlooEntity", () => {
    const entity = normalizeEntity(raw({ release_year: 1961 }), HOSTS);
    expect(entity).toEqual({
      entityId: "fx-artist-1",
      name: "Patsy Cline",
      type: "urn:entity:artist",
      domain: "music",
      year: 1961,
      imageUrl: null,
      tags: [{ id: "t1", name: "Country" }],
      affinity: 0.89,
      explainability: { "fx-seed-1": 0.85 },
    });
  });

  it.each([
    ["urn:entity:artist", "music"],
    ["urn:entity:movie", "film"],
    ["urn:entity:tv_show", "tv"],
    ["urn:entity:book", "book"],
    ["urn:entity:place", "place"],
    ["urn:entity:brand", "brand"],
  ])("maps %s to the %s domain", (type, domain) => {
    expect(normalizeEntity(raw({}, { type }), HOSTS)?.domain).toBe(domain);
  });

  it("returns null for a type Memory Lane has no domain for", () => {
    expect(normalizeEntity(raw({}, { type: "urn:entity:podcast" }), HOSTS)).toBeNull();
  });

  it("keeps unknown extra keys harmlessly (passthrough) but never copies them out", () => {
    const entity = normalizeEntity(raw({}, { surprise: { deep: true } }), HOSTS);
    expect(entity).not.toBeNull();
    expect(entity).not.toHaveProperty("surprise");
  });

  it.each([
    ["not an object", "hello"],
    ["null", null],
    ["missing id", { name: "x", type: "urn:entity:artist" }],
    ["empty name", raw({}, { name: "" })],
    ["numeric id", raw({}, { entity_id: 7 })],
    ["id over 64 chars", raw({}, { entity_id: "x".repeat(65) })],
  ])("returns null for %s", (_label, value) => {
    expect(normalizeEntity(value, HOSTS)).toBeNull();
  });

  it("clamps affinity into 0..1 and defaults to null when absent or not a number", () => {
    expect(normalizeEntity(raw({}, { query: { affinity: 1.7 } }), HOSTS)?.affinity).toBe(1);
    expect(normalizeEntity(raw({}, { query: { affinity: -2 } }), HOSTS)?.affinity).toBe(0);
    expect(normalizeEntity(raw({}, { query: {} }), HOSTS)?.affinity).toBeNull();
    expect(normalizeEntity(raw({}, { query: undefined }), HOSTS)?.affinity).toBeNull();
    expect(normalizeEntity(raw({}, { query: { affinity: "high" } }), HOSTS)?.affinity).toBeNull();
  });

  it("drops malformed tags and non-integer years instead of failing the entity", () => {
    const entity = normalizeEntity(
      raw(
        { release_year: "1961" },
        { tags: [{ tag_id: "t1", name: "Country" }, { name: "no id" }, "junk", { tag_id: "t2" }] },
      ),
      HOSTS,
    );
    expect(entity?.tags).toEqual([{ id: "t1", name: "Country" }]);
    expect(entity?.year).toBeUndefined();
  });

  it("keeps only numeric explainability scores", () => {
    const entity = normalizeEntity(
      raw({}, { query: { affinity: 0.5, explainability: { a: 0.4, b: "x", c: null } } }),
      HOSTS,
    );
    expect(entity?.explainability).toEqual({ a: 0.4 });
  });
});

describe("isAllowedImageHost", () => {
  it("compares hostnames case-insensitively", () => {
    expect(isAllowedImageHost("https://IMAGES.Qloo.Example/a.jpg", HOSTS)).toBe(true);
  });
});
