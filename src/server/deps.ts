import "server-only";
import { createQlooClient } from "@/qloo";
import { getServerConfig } from "@/server/config";
import type { KitHandlerDeps } from "@/server/handlers/kit";

/**
 * Production wiring for the Kit handler: the validated server config picks the
 * Qloo client (fixture mode needs no key). Called per request, so a bad
 * environment fails at the first request with a clear `ConfigError`.
 */
export function getKitDeps(): KitHandlerDeps {
  return { client: createQlooClient(getServerConfig()) };
}
