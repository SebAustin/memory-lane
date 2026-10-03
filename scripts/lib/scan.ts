import { randomBytes } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

export interface Finding {
  /** Path relative to the scanned directory. */
  readonly file: string;
  /** Index into the canary list. The canary value itself is never reported. */
  readonly canaryIndex: number;
}

export interface ScanResult {
  readonly findings: readonly Finding[];
  readonly filesScanned: number;
}

/** Server secrets that must never reach the browser bundle (NFR-13). */
const SECRET_VARS = ["QLOO_API_KEY", "AI_GATEWAY_API_KEY"] as const;
const CANARY_RANDOM_BYTES = 16;

export type CanaryEnv = Readonly<Record<(typeof SECRET_VARS)[number], string>>;

/** Fresh, unguessable canary values, one per server secret. */
export function canaryValues(): CanaryEnv {
  const make = (name: string) => `canary-${name.toLowerCase()}-${randomBytes(CANARY_RANDOM_BYTES).toString("hex")}`;
  return Object.fromEntries(SECRET_VARS.map((name) => [name, make(name)])) as CanaryEnv;
}

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

/**
 * Scans every file under `dir` (including source maps and binaries) for any
 * canary string. Fails closed: a missing or empty directory or an empty
 * canary list throws, so a misconfigured CI step cannot pass vacuously.
 */
export async function scanDirectory(dir: string, canaries: readonly string[]): Promise<ScanResult> {
  if (canaries.length === 0 || canaries.some((c) => c.length === 0)) {
    throw new Error("scan requires at least one non-empty canary");
  }
  const info = await stat(dir).catch(() => null);
  if (!info?.isDirectory()) throw new Error(`scan directory not found: ${dir}`);

  const needles = canaries.map((c) => Buffer.from(c));
  const findings: Finding[] = [];
  let filesScanned = 0;

  for await (const path of walk(dir)) {
    filesScanned += 1;
    const content = await readFile(path);
    needles.forEach((needle, canaryIndex) => {
      if (content.includes(needle)) findings.push({ file: relative(dir, path), canaryIndex });
    });
  }

  if (filesScanned === 0) throw new Error(`no files to scan in ${dir}`);
  return { findings, filesScanned };
}
