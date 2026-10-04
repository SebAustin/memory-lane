import { describe, expect, it } from "vitest";
import { EMPTY_STORE, migrate, type Migration } from "./migrations";

/** A made-up schema 0 that kept Life Stories under a different key. */
const v0ToV1: Migration = {
  from: 0,
  up: (raw) => {
    const old = raw as { schemaVersion: 0; stories: unknown[] };
    const { stories, ...rest } = old;
    return { ...rest, schemaVersion: 1, lifeStories: stories, draft: null, profiles: {}, kits: {}, sessionLogs: {}, activeStoryId: null };
  },
};

describe("migrate", () => {
  it("treats a missing value as a fresh, empty store", () => {
    const result = migrate(undefined, []);

    expect(result).toEqual({ kind: "empty", state: EMPTY_STORE });
  });

  it("accepts current-version data as it is", () => {
    const result = migrate({ ...EMPTY_STORE }, []);

    expect(result.kind).toBe("ok");
  });

  it("runs the migration chain from an older version, in order, and says where it started", () => {
    const result = migrate({ schemaVersion: 0, stories: [] }, [v0ToV1]);

    expect(result).toMatchObject({ kind: "ok", migratedFrom: 0 });
  });

  it("reports data from a newer version without trying to read it", () => {
    const result = migrate({ schemaVersion: 2, whatever: true }, []);

    expect(result).toEqual({ kind: "future", version: 2 });
  });

  it.each([
    ["a string", "hello"],
    ["null", null],
    ["an array", []],
    ["no schemaVersion", { lifeStories: [] }],
    ["a non-integer schemaVersion", { schemaVersion: 1.5 }],
    ["a negative schemaVersion", { schemaVersion: -1 }],
  ])("flags %s as invalid", (_label, raw) => {
    expect(migrate(raw, []).kind).toBe("invalid");
  });

  it("flags current-version data that breaks the schema", () => {
    const result = migrate({ ...EMPTY_STORE, lifeStories: "nope" }, []);

    expect(result.kind).toBe("invalid");
  });

  it("flags an older version with no migration for it", () => {
    const result = migrate({ schemaVersion: 0 }, []);

    expect(result).toMatchObject({ kind: "invalid" });
  });

  it("flags a migration that throws, without leaking its message", () => {
    const boom: Migration = {
      from: 0,
      up: () => {
        throw new Error("secret detail Margaret Smith");
      },
    };

    const result = migrate({ schemaVersion: 0 }, [boom]);

    expect(result.kind).toBe("invalid");
    expect(JSON.stringify(result)).not.toContain("Margaret");
  });

  it("flags a migration that does not move the version forward", () => {
    const stuck: Migration = { from: 0, up: (raw) => raw };

    expect(migrate({ schemaVersion: 0 }, [stuck]).kind).toBe("invalid");
  });

  it("never hands back the empty-store constant for mutation", () => {
    expect(Object.isFrozen(EMPTY_STORE)).toBe(true);
  });
});
