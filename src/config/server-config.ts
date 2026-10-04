import { logEvent, type Logger } from "../lib/log";
import { ConfigError, parseEnv, type EnvSource, type ServerEnv } from "./env";
import { BUCKET_NAMES, DEFAULT_LIMITS, type BucketName, type RateLimit } from "./limits";

/*
 * No `server-only` and no `@/` aliases in this file: `next.config.ts` imports
 * it to validate the environment at build time (H1), outside Next's bundler.
 */

export interface ServerConfig {
  readonly qlooMode: "fixture" | "live";
  readonly llmMode: "gateway" | "mock" | "off";
  readonly modelId: string;
  readonly judgeModelId: string;
  readonly rateLimitMode: "on" | "off";
  readonly limits: Readonly<Record<BucketName, RateLimit>>;
  readonly llmDailyCap: number;
  readonly imageHosts: readonly string[];
  /**
   * Raw `QLOO_FIXTURE_FAULTS` spec (for example `all`, `book:500`), already
   * gated: always undefined when deployed (`VERCEL_ENV` preview or production). Parsed by the fixture client.
   */
  readonly fixtureFaults: string | undefined;
}

/** Only a Vercel preview or production environment counts as deployed (A31). */
function isDeployed(env: ServerEnv): boolean {
  return env.vercelEnv === "preview" || env.vercelEnv === "production";
}

/** Throws for combinations that must never boot (R5, A31, SC-12). */
function assertSafe(env: ServerEnv): void {
  if (env.rateLimitMode === "off" && isDeployed(env)) {
    throw new ConfigError(
      "Unsafe configuration: RATE_LIMIT_MODE=off is not allowed when deployed (VERCEL_ENV is preview or production)",
    );
  }
  if (env.llmMode === "mock" && (!env.allowMockLlm || isDeployed(env))) {
    throw new ConfigError(
      "Unsafe configuration: LLM_MODE=mock needs ALLOW_MOCK_LLM=1 and is refused when deployed (VERCEL_ENV is preview or production)",
    );
  }
  if (env.qlooMode === "live") {
    throw new ConfigError(
      "Unsupported configuration: QLOO_MODE=live is not available yet (the live client lands in ticket 05 and is wired in ticket 23)",
    );
  }
}

/** Dev-only flags that a deployment ignores: logged by name, never by value. */
function logIgnoredDevFlags(env: ServerEnv, log: Logger): void {
  if (!isDeployed(env)) return;
  const ignored = [
    env.allowMockLlm ? "ALLOW_MOCK_LLM" : undefined,
    env.fixtureFaults !== undefined ? "QLOO_FIXTURE_FAULTS" : undefined,
  ].filter((flag): flag is string => flag !== undefined);
  for (const flag of ignored) {
    log({ event: "config.dev_flag_ignored", level: "warn", flag });
  }
}

function resolveLimits(env: ServerEnv): Record<BucketName, RateLimit> {
  return Object.fromEntries(
    BUCKET_NAMES.map((bucket) => [bucket, env.limitOverrides[bucket] ?? DEFAULT_LIMITS[bucket]]),
  ) as Record<BucketName, RateLimit>;
}

/**
 * Builds the validated, immutable server configuration from `env`.
 * Pure: the same input always yields the same output (seam 9). Throws
 * `ConfigError` on invalid or unsafe input; callers treat that as a boot error.
 */
export function getServerConfig(env: EnvSource = process.env, log: Logger = logEvent): ServerConfig {
  const parsed = parseEnv(env);
  assertSafe(parsed);
  logIgnoredDevFlags(parsed, log);

  return {
    qlooMode: parsed.qlooMode,
    llmMode: parsed.llmMode,
    modelId: parsed.modelId,
    judgeModelId: parsed.judgeModelId,
    rateLimitMode: parsed.rateLimitMode,
    limits: resolveLimits(parsed),
    llmDailyCap: parsed.llmDailyCap,
    imageHosts: parsed.imageHosts,
    fixtureFaults: isDeployed(parsed) ? undefined : parsed.fixtureFaults,
  };
}
