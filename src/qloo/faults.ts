import "server-only";
import type { Domain } from "@/contracts";
import type { ErrorCode } from "./types";

/**
 * `QLOO_FIXTURE_FAULTS` (EVALS (c)): makes the fixture client fail like Qloo
 * does, so the error paths can be tested and demoed with no key. Honoured
 * only when `VERCEL_ENV` is unset (never on a Vercel deployment). Grammar:
 *
 *   spec  = fault ("," fault)*
 *   fault = scope [":" failure ["x" count]]
 *   scope = "all" | a domain | "fingerprint" | "search" | "tags"
 *   failure = an HTTP status (400 to 599) | "timeout"      (default 500)
 *   count = how many requests fail (default: every one)
 *
 * A count is in HTTP requests, as the resilient client sends them: with up to
 * 3 retries, `music:429x2` is a blip that recovers on the third request, and
 * `music:429x4` outlasts the retries.
 */

export type FaultScope = "all" | Domain | "fingerprint" | "search" | "tags";
export type FaultFailure = number | "timeout";

export interface Fault {
  readonly scope: FaultScope;
  readonly failure: FaultFailure;
  /** Requests that fail; `Infinity` for every one. */
  readonly times: number;
}

const SCOPES: ReadonlySet<string> = new Set([
  "all", "music", "film", "tv", "book", "place", "brand", "fingerprint", "search", "tags",
]);

const MIN_STATUS = 400;
const MAX_STATUS = 599;

function invalid(item: string): never {
  throw new Error(`Invalid QLOO_FIXTURE_FAULTS entry "${item}"`);
}

function parseFault(item: string): Fault {
  const [scope, rest, ...extra] = item.split(":");
  if (scope === undefined || !SCOPES.has(scope) || extra.length > 0) invalid(item);

  if (rest === undefined) return { scope: scope as FaultScope, failure: 500, times: Infinity };
  const match = /^(timeout|\d{3})(?:x(\d+))?$/.exec(rest);
  if (match === null) invalid(item);
  const [, failureText, countText] = match;
  const failure = failureText === "timeout" ? "timeout" : Number(failureText);
  if (typeof failure === "number" && (failure < MIN_STATUS || failure > MAX_STATUS)) invalid(item);
  const times = countText === undefined ? Infinity : Number(countText);
  if (times < 1) invalid(item);
  return { scope: scope as FaultScope, failure, times };
}

/**
 * Parses the spec; empty whenever `vercelEnv` is set (an empty value counts as
 * unset, as in `parseEnv`), so a deployment can never be made to fail on purpose.
 */
export function parseFaults(spec: string | undefined, vercelEnv: string | undefined): Fault[] {
  if ((vercelEnv !== undefined && vercelEnv.trim() !== "") || spec === undefined || spec.trim() === "") return [];
  return spec
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "")
    .map(parseFault);
}

export interface FaultPlan {
  /** The failure for the next request in `scope`, or undefined to let it through. Counts down. */
  next(scope: Exclude<FaultScope, "all">): FaultFailure | undefined;
}

/** Tracks how many requests each fault has left to fail. */
export function createFaultPlan(faults: readonly Fault[]): FaultPlan {
  const remaining = faults.map((fault) => fault.times);
  return {
    next(scope) {
      const index = faults.findIndex(
        (fault, i) => (fault.scope === scope || fault.scope === "all") && (remaining[i] ?? 0) > 0,
      );
      if (index < 0) return undefined;
      remaining[index] = (remaining[index] ?? 0) - 1;
      return faults[index]?.failure;
    },
  };
}

/** How the resilient client reports a failed request, once it has given up. */
export function errorCodeFor(failure: FaultFailure): ErrorCode {
  if (failure === "timeout") return "timeout";
  if (failure === 429) return "rate_limited";
  if (failure === 401) return "auth";
  if (failure === 403) return "unsupported_type";
  if (failure === 400 || failure === 404 || failure === 422) return "bad_param";
  return "upstream";
}

/** Whether the resilient client retries this failure (429, 5xx and timeouts only). */
export function isRetryable(failure: FaultFailure): boolean {
  return failure === "timeout" || failure === 429 || failure >= 500;
}
