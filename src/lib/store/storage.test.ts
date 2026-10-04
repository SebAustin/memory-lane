import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultStorage, idbStorage, memoryStorage } from "./storage";

let dbCounter = 0;
const freshDb = () => `test-db-${(dbCounter += 1)}`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each([
  ["memoryStorage", () => memoryStorage(), "memory"],
  ["idbStorage", () => idbStorage({ dbName: freshDb() }), "indexeddb"],
] as const)("%s", (_name, make, kind) => {
  it("reports its kind", () => {
    expect(make().kind).toBe(kind);
  });

  it("returns undefined for a missing key", async () => {
    expect(await make().get("nope")).toBeUndefined();
  });

  it("round-trips a value through set and get", async () => {
    const storage = make();

    await storage.set("k", { a: [1, 2, { b: "c" }] });

    expect(await storage.get("k")).toEqual({ a: [1, 2, { b: "c" }] });
  });

  it("hands back a copy, so callers cannot reach into what is stored", async () => {
    const storage = make();
    const original = { list: [1] };
    await storage.set("k", original);

    original.list.push(2);
    const first = (await storage.get("k")) as { list: number[] };
    first.list.push(3);

    expect(await storage.get("k")).toEqual({ list: [1] });
  });

  it("deletes a key, and deleting a missing key is not an error", async () => {
    const storage = make();
    await storage.set("k", 1);

    await storage.del("k");
    await storage.del("never-there");

    expect(await storage.get("k")).toBeUndefined();
  });
});

describe("defaultStorage", () => {
  it("uses IndexedDB when the browser has it", () => {
    expect(defaultStorage().kind).toBe("indexeddb");
  });

  it("falls back to memory when IndexedDB is not available", () => {
    vi.stubGlobal("indexedDB", undefined);

    expect(defaultStorage().kind).toBe("memory");
  });

  it("keeps separate databases apart", async () => {
    const a = idbStorage({ dbName: freshDb() });
    const b = idbStorage({ dbName: freshDb() });
    await a.set("k", "from a");

    expect(await b.get("k")).toBeUndefined();
  });

  it("opens lazily, so importing the module on a server touches nothing", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    const open = vi.spyOn(indexedDB, "open");

    const storage = idbStorage({ dbName: freshDb() });
    expect(open).not.toHaveBeenCalled();

    await storage.get("k");
    expect(open).toHaveBeenCalledTimes(1);
  });
});
