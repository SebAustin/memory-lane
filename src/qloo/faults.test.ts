import { describe, expect, it } from "vitest";
import { createFaultPlan, parseFaults } from "@/qloo/faults";

describe("parseFaults (EVALS (c))", () => {
  it("reads `all` as a persistent 500 on every call", () => {
    expect(parseFaults("all", undefined)).toEqual([{ scope: "all", failure: 500, times: Infinity }]);
  });

  it("reads a scope with a status", () => {
    expect(parseFaults("book:500", undefined)).toEqual([{ scope: "book", failure: 500, times: Infinity }]);
    expect(parseFaults("tv:403", undefined)).toEqual([{ scope: "tv", failure: 403, times: Infinity }]);
  });

  it("reads a repeat count after x", () => {
    expect(parseFaults("music:429x4", undefined)).toEqual([{ scope: "music", failure: 429, times: 4 }]);
  });

  it("reads timeout as a failure, and a bare scope as a 500", () => {
    expect(parseFaults("film:timeoutx2", undefined)).toEqual([{ scope: "film", failure: "timeout", times: 2 }]);
    expect(parseFaults("place", undefined)).toEqual([{ scope: "place", failure: 500, times: Infinity }]);
  });

  it("reads several, ignoring spaces", () => {
    expect(parseFaults(" music:429x4 , book:500 ", undefined)).toHaveLength(2);
  });

  it("knows fingerprint, search and tags as scopes", () => {
    const scopes = parseFaults("fingerprint:500,search:429,tags:500", undefined).map((fault) => fault.scope);
    expect(scopes).toEqual(["fingerprint", "search", "tags"]);
  });

  it("is empty when there is nothing to parse", () => {
    expect(parseFaults(undefined, undefined)).toEqual([]);
    expect(parseFaults("", undefined)).toEqual([]);
  });

  it("is ignored whenever VERCEL_ENV is set, even for a malformed spec", () => {
    expect(parseFaults("all", "production")).toEqual([]);
    expect(parseFaults("all", "preview")).toEqual([]);
    expect(parseFaults("all", "development")).toEqual([]);
    expect(parseFaults("not a spec", "production")).toEqual([]);
  });

  it("treats an empty VERCEL_ENV as unset", () => {
    expect(parseFaults("all", "")).toHaveLength(1);
  });

  it.each(["nowhere:500", "music:abc", "music:429x0", "music:99", "music:429x", ":500", "music:429:1"])(
    "throws on a malformed spec %j, naming the variable",
    (spec) => {
      expect(() => parseFaults(spec, undefined)).toThrow(/QLOO_FIXTURE_FAULTS/);
    },
  );
});

describe("createFaultPlan", () => {
  it("fails exactly `times` requests, then lets calls through", () => {
    const plan = createFaultPlan(parseFaults("music:429x2", undefined));
    expect([plan.next("music"), plan.next("music"), plan.next("music")]).toEqual([429, 429, undefined]);
  });

  it("applies `all` to every scope", () => {
    const plan = createFaultPlan(parseFaults("all", undefined));
    expect(plan.next("book")).toBe(500);
    expect(plan.next("search")).toBe(500);
    expect(plan.next("fingerprint")).toBe(500);
  });

  it("keeps scopes apart", () => {
    const plan = createFaultPlan(parseFaults("book:500", undefined));
    expect(plan.next("music")).toBeUndefined();
    expect(plan.next("book")).toBe(500);
  });

  it("uses the first fault with requests left", () => {
    const plan = createFaultPlan(parseFaults("music:429x1,music:500x1", undefined));
    expect([plan.next("music"), plan.next("music"), plan.next("music")]).toEqual([429, 500, undefined]);
  });

  it("does nothing with no faults", () => {
    expect(createFaultPlan([]).next("music")).toBeUndefined();
  });
});
