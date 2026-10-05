import type { ExportFile, StoreV1 } from "@/contracts";
import { z } from "@/contracts/z";
import { CURRENT_SCHEMA_VERSION, migrate, type Migration } from "./migrations";

/** The largest file Import will read (FR-26, SC-12). */
export const MAX_IMPORT_BYTES = 512 * 1024;
const MAX_IMPORT_LABEL = "512 KB";

/** What an import can be turned away for. `read_only` and `save_failed` come from the repository, not the file. */
export type ImportFailureReason =
  | "too_large"
  | "not_json"
  | "not_memory_lane"
  | "invalid"
  | "future_version"
  | "read_only"
  | "save_failed";

/** How much a file holds, so the Caregiver can see what they are about to bring in. */
export interface ImportCounts {
  readonly lifeStories: number;
  readonly kits: number;
  readonly sessionLogs: number;
}

/** A failed import. The message is safe to show: it never contains anything from the file. */
export interface ImportFailure {
  readonly ok: false;
  readonly reason: ImportFailureReason;
  readonly message: string;
}

/** The outcome of an import (PLAN section 3.5). */
export type ImportResult =
  | { readonly ok: true; readonly counts: ImportCounts; readonly migratedFrom?: number }
  | ImportFailure;

/**
 * Fixed, plain-language messages. They say what happened, that nothing on this
 * device changed, and what to do. Nothing from the file is ever echoed back.
 */
export const IMPORT_MESSAGES: Readonly<Record<ImportFailureReason, string>> = {
  too_large: `That file is larger than ${MAX_IMPORT_LABEL}, which is more than a Memory Lane export holds. Nothing on this device changed. Choose the file you exported from Memory Lane.`,
  not_json: "We couldn't read that file. It should be the .json file you exported from Memory Lane. Nothing on this device changed.",
  not_memory_lane: "That file doesn't look like a Memory Lane export. Nothing on this device changed. Choose the .json file you exported from Memory Lane.",
  invalid: "That Memory Lane file is damaged or incomplete, so we did not use any of it. Nothing on this device changed. Try exporting again from the original device.",
  future_version: "That file comes from a newer version of Memory Lane than this one, so we can't open it safely. Nothing on this device changed. Open Memory Lane from the same place you exported it, or update and try again.",
  read_only: "This device holds Life Stories from a newer version of Memory Lane, and an import would overwrite them. Export them first, then Delete all data, then import.",
  save_failed: "We couldn't save the imported data on this device, so nothing was changed. Your current Life Stories are still here.",
};

export const importFailure = (reason: ImportFailureReason): ImportFailure => ({
  ok: false,
  reason,
  message: IMPORT_MESSAGES[reason],
});

/** The wrapper around the data. Strict: an unknown key means this is not our file. `data` is checked later, once migrated. */
const Envelope = z.strictObject({
  app: z.literal("memory-lane"),
  schemaVersion: z.number().int().min(0),
  exportedAt: z.iso.datetime(),
  data: z.record(z.string(), z.unknown()),
});

export type ParsedImport =
  | { readonly ok: true; readonly state: StoreV1; readonly counts: ImportCounts; readonly migratedFrom?: number }
  | ImportFailure;

const byteLength = (text: string): number => new TextEncoder().encode(text).length;

const countsOf = (state: StoreV1): ImportCounts => ({
  lifeStories: state.lifeStories.length,
  kits: Object.values(state.kits).reduce((total, kits) => total + kits.length, 0),
  sessionLogs: Object.values(state.sessionLogs).reduce((total, logs) => total + logs.length, 0),
});

/**
 * Reads an export file all the way to a validated, current-version store, or
 * says why not. It is pure: nothing is applied here, so a rejected file can
 * never leave anything half done.
 */
export function readImportFile(
  text: string,
  migrations: readonly Migration[],
  target: number = CURRENT_SCHEMA_VERSION,
): ParsedImport {
  if (byteLength(text) > MAX_IMPORT_BYTES) return importFailure("too_large");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return importFailure("not_json");
  }

  const envelope = Envelope.safeParse(json);
  if (!envelope.success) return importFailure("not_memory_lane");
  if (envelope.data.schemaVersion > target) return importFailure("future_version");

  const result = migrate(envelope.data.data, migrations, target);
  switch (result.kind) {
    case "future":
      return importFailure("future_version");
    case "invalid":
    case "empty":
      return importFailure("invalid");
    case "ok": {
      const fileVersion = result.migratedFrom ?? target;
      if (envelope.data.schemaVersion !== fileVersion) return importFailure("invalid");
      const counts = countsOf(result.state);
      return result.migratedFrom === undefined
        ? { ok: true, state: result.state, counts }
        : { ok: true, state: result.state, counts, migratedFrom: result.migratedFrom };
    }
  }
}

/** Builds the file the Caregiver downloads. `data` is the store as it stands. */
export function buildExportFile(data: StoreV1, exportedAt: string): ExportFile {
  return { app: "memory-lane", schemaVersion: data.schemaVersion, exportedAt, data };
}
