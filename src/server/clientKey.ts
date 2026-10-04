import "server-only";
import { createHash, randomUUID } from "node:crypto";

/**
 * The rate-limit key for a caller (PLAN 3.4): `sha256(daily salt + first
 * x-forwarded-for)`. The address is never stored or logged, and the salt
 * changes every UTC day, so a key cannot be followed from one day to the next.
 * The salt mixes in a per-process secret, so it cannot be rebuilt from the
 * date alone and the hashed address space cannot be brute-forced offline.
 */

const NO_ADDRESS = "unknown";

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

export interface ClientKeyOptions {
  /** Clock (seam 10). Defaults to the system clock. */
  readonly now?: () => number;
  /** Secret mixed into the daily salt. Defaults to a random value per process. */
  readonly secret?: string;
}

export function createClientKey({
  now = Date.now,
  secret = randomUUID(),
}: ClientKeyOptions = {}): (req: Request) => string {
  return (req) => {
    const day = new Date(now()).toISOString().slice(0, 10);
    const first = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    return sha256(`${sha256(`${secret}:${day}`)}:${first === undefined || first === "" ? NO_ADDRESS : first}`);
  };
}

/** The key used by the deployed routes. */
export const clientKey = createClientKey();
