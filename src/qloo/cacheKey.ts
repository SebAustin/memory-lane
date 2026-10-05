import "server-only";
import { createHash } from "node:crypto";

/** Query parameters as sent on the wire: names and string values. */
export type WireQuery = Readonly<Record<string, string>>;

/** The canonical query string: keys sorted, both sides percent-encoded. Used for the cache key and the request URL. */
export function canonicalQuery(query: WireQuery): string {
  return Object.entries(query)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

/**
 * `sha256(endpoint + sorted canonical query)` (PLAN 5.2, NFR-8). A hash, so
 * the key never holds readable text. The Person's first name is never in the
 * params in the first place: it does not leave the device (ADR 0001).
 */
export function cacheKey(endpoint: string, query: WireQuery): string {
  return createHash("sha256").update(`${endpoint}?${canonicalQuery(query)}`).digest("hex");
}
