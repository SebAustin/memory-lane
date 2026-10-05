import "server-only";
import { getCache } from "@vercel/functions";
import type { ServerConfig } from "@/server/config";
import {
  CACHE_NAMESPACE,
  createDeduper,
  createTieredCache,
  type Deduper,
  type KvCache,
  type RuntimeCacheLike,
} from "./cache";
import { parseFaults } from "./faults";
import { FixtureQlooClient } from "./fixture";
import { bundledFixtureIndex } from "./fixtures";
import { HttpQlooClient, type Sleep } from "./http";
import type { Logger } from "@/lib/log";
import type { QlooClient } from "./types";

export type { Envelope, InsightsParams, QlooClient, QlooEntity } from "./types";
export { createCallBudget } from "./budget";
export { buildInsightsParams } from "./params";
export { backoffDelay } from "./backoff";
export { cacheKey } from "./cacheKey";
export { createTieredCache } from "./cache";
export { normalizeEntity } from "./normalize";
export { resolveSeed, resolveTag } from "./resolve";
export { SENSITIVE_TAG_IDS } from "./sensitiveTags";

/** Seams for tests (PLAN 3.1). Production passes none of them. */
export interface QlooDeps {
  readonly fetch?: typeof fetch;
  readonly cache?: KvCache;
  readonly sleep?: Sleep;
  readonly random?: () => number;
  readonly now?: () => number;
  readonly log?: Logger;
  /** `VERCEL_ENV`, read from the process unless given. Fixture faults are ignored when it is set. */
  readonly vercelEnv?: string;
}

const LRU_MAX = 500;

/**
 * The Runtime Cache belongs to the request context on Vercel, so it is looked
 * up on each use. Where there is none (local dev, tests) the LRU works alone.
 */
function vercelRuntimeCache(): RuntimeCacheLike | undefined {
  try {
    return getCache({ namespace: CACHE_NAMESPACE });
  } catch {
    return undefined;
  }
}

/** Handlers build a client per request, so the cache and the in-flight map live for the whole instance. */
let shared: { readonly cache: KvCache; readonly dedupe: Deduper } | undefined;
function sharedCache(): { readonly cache: KvCache; readonly dedupe: Deduper } {
  shared ??= {
    cache: createTieredCache({ lruMax: LRU_MAX, runtime: vercelRuntimeCache }),
    dedupe: createDeduper(),
  };
  return shared;
}

/**
 * Builds the Qloo client for the configured mode with no code changes between
 * them (NFR-19): fixtures need no key; live needs `QLOO_API_KEY` (checked at
 * boot by `getServerConfig`, and again here) and sends it as `X-Api-Key`.
 */
export function createQlooClient(config: ServerConfig, deps: QlooDeps = {}): QlooClient {
  if (config.qlooMode === "live") {
    if (config.qlooApiKey === undefined) {
      throw new Error("QLOO_MODE=live needs QLOO_API_KEY");
    }
    const { cache, dedupe } = deps.cache === undefined ? sharedCache() : { cache: deps.cache, dedupe: createDeduper() };
    return new HttpQlooClient({
      baseUrl: config.qlooBaseUrl,
      apiKey: config.qlooApiKey,
      fetch: deps.fetch ?? fetch,
      cache,
      dedupe,
      sleep: deps.sleep,
      random: deps.random,
      now: deps.now,
      imageHosts: config.imageHosts,
      log: deps.log,
    });
  }
  return new FixtureQlooClient({
    index: bundledFixtureIndex,
    imageHosts: config.imageHosts,
    faults: parseFaults(config.fixtureFaults, deps.vercelEnv ?? process.env.VERCEL_ENV),
  });
}
