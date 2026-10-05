import { StoreV1 } from "@/contracts";
import { deepFreeze } from "@/lib/deep-freeze";

/** The one key everything lives under (ADR 0001). */
export const STORE_KEY = "memory-lane:store";
/** Where data we could not read is set aside, so nothing is lost silently. */
export const QUARANTINE_KEY = "memory-lane:quarantine";
/** Every key this app writes. Delete all removes each of them (FR-27), so a new key must be listed here. */
export const OWNED_KEYS: readonly string[] = [STORE_KEY, QUARANTINE_KEY];
/** The schema version this build reads and writes. */
export const CURRENT_SCHEMA_VERSION = 1;

/** A fresh, empty store. Frozen: every change makes a new object. */
export const EMPTY_STORE: StoreV1 = deepFreeze({
  schemaVersion: 1,
  lifeStories: [],
  draft: null,
  profiles: {},
  kits: {},
  sessionLogs: {},
  activeStoryId: null,
});

/** One step on the upgrade path: turns version `from` into version `from + 1`. */
export interface Migration {
  readonly from: number;
  readonly up: (raw: unknown) => unknown;
}

/** Migrations to apply, oldest first. Empty while schema 1 is the only version. */
export const MIGRATIONS: readonly Migration[] = [];

export type InvalidReason = "unreadable" | "no_migration" | "migration_failed" | "schema_mismatch";

export type MigrateResult =
  | { readonly kind: "empty"; readonly state: StoreV1 }
  | { readonly kind: "ok"; readonly state: StoreV1; readonly migratedFrom?: number }
  | { readonly kind: "future"; readonly version: number }
  | { readonly kind: "invalid"; readonly reason: InvalidReason };

const invalid = (reason: InvalidReason): MigrateResult => ({ kind: "invalid", reason });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function versionOf(raw: unknown): number | null {
  if (!isRecord(raw)) return null;
  const { schemaVersion } = raw;
  return typeof schemaVersion === "number" && Number.isInteger(schemaVersion) && schemaVersion >= 0
    ? schemaVersion
    : null;
}

type Upgrade = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly reason: InvalidReason };

/** Walks `raw` up to `target`, one migration at a time. */
function upgrade(raw: unknown, from: number, target: number, migrations: readonly Migration[]): Upgrade {
  let current = raw;
  for (let version = from; version < target; version += 1) {
    const step = migrations.find((m) => m.from === version);
    if (step === undefined) return { ok: false, reason: "no_migration" };
    try {
      current = step.up(current);
    } catch {
      return { ok: false, reason: "migration_failed" };
    }
    if (versionOf(current) !== version + 1) return { ok: false, reason: "migration_failed" };
  }
  return { ok: true, value: current };
}

/**
 * Turns whatever was stored into a current-version store, or says why it can't.
 * Reasons are fixed codes, never messages: stored data is personal, and so is
 * whatever a migration might say about it.
 */
export function migrate(
  raw: unknown,
  migrations: readonly Migration[],
  target: number = CURRENT_SCHEMA_VERSION,
): MigrateResult {
  if (raw === undefined) return { kind: "empty", state: EMPTY_STORE };
  const version = versionOf(raw);
  if (version === null) return invalid("unreadable");
  if (version > target) return { kind: "future", version };

  const upgraded = upgrade(raw, version, target, migrations);
  if (!upgraded.ok) return invalid(upgraded.reason);

  const parsed = StoreV1.safeParse(upgraded.value);
  if (!parsed.success) return invalid("schema_mismatch");
  return version === target
    ? { kind: "ok", state: parsed.data }
    : { kind: "ok", state: parsed.data, migratedFrom: version };
}
