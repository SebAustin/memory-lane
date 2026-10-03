import "server-only";
import type { ServerConfig } from "@/server/config";
import { FixtureQlooClient } from "./fixture";
import { bundledFixtureIndex } from "./fixtures";
import type { QlooClient } from "./types";

export type { Envelope, InsightsParams, QlooClient, QlooEntity } from "./types";

/**
 * Builds the Qloo client for the configured mode. Fixture mode needs no key.
 * Live mode arrives with the resilient HTTP client (ticket 05, wired in ticket 23).
 */
export function createQlooClient(config: ServerConfig): QlooClient {
  if (config.qlooMode === "live") {
    throw new Error("QLOO_MODE=live is not available yet: the live client lands in ticket 05");
  }
  return new FixtureQlooClient({ index: bundledFixtureIndex, imageHosts: config.imageHosts });
}
