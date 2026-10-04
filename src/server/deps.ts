import "server-only";
import { createQlooClient } from "@/qloo";
import { clientKey } from "@/server/clientKey";
import { getServerConfig } from "@/server/config";
import type { ResolveHandlerDeps } from "@/server/handlers/resolve";
import type { BuildInterimKitDeps } from "@/server/kit/buildInterimKit";
import { createRateLimiter, type RateLimiter } from "@/server/rateLimit";

/**
 * Production wiring for the handlers: the validated server config picks the
 * Qloo client (fixture mode needs no key). Called per request, so a bad
 * environment fails at the first request with a clear `ConfigError`.
 */
export function getKitDeps(): BuildInterimKitDeps {
  return { client: createQlooClient(getServerConfig()) };
}

const UNLIMITED: RateLimiter = () => ({ ok: true, retryAfterSec: 0 });

/** Buckets live for the life of the instance, so every request must share one limiter. */
let resolveLimiter: { readonly key: string; readonly limiter: RateLimiter } | undefined;

function sharedResolveLimiter(mode: "on" | "off", capacity: number, perMinutes: number): RateLimiter {
  if (mode === "off") return UNLIMITED;
  const key = `${capacity}/${perMinutes}`;
  if (resolveLimiter?.key !== key) {
    resolveLimiter = { key, limiter: createRateLimiter({ capacity, perMinutes }) };
  }
  return resolveLimiter.limiter;
}

export function getResolveDeps(): ResolveHandlerDeps {
  const config = getServerConfig();
  const { capacity, perMinutes } = config.limits.resolve;
  return {
    client: createQlooClient(config),
    limiter: sharedResolveLimiter(config.rateLimitMode, capacity, perMinutes),
    clientKey,
  };
}
