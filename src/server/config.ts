import "server-only";
import { ConfigError, parseEnv, type EnvSource, type ServerEnv } from "@/config/env";
import { BUCKET_NAMES, DEFAULT_LIMITS, type BucketName, type RateLimit } from "@/config/limits";

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
   * gated: always undefined when `VERCEL_ENV` is set. Parsed by the fixture client.
   */
  readonly fixtureFaults: string | undefined;
}

/** Throws for combinations that must never boot (R5, A31, SC-12). */
function assertSafe(env: ServerEnv): void {
  if (env.rateLimitMode === "off" && env.vercelEnv !== undefined) {
    throw new ConfigError(
      "Unsafe configuration: RATE_LIMIT_MODE=off is not allowed when VERCEL_ENV is set",
    );
  }
  if (env.qlooMode === "live" && env.qlooApiKey === undefined) {
    throw new ConfigError("Invalid configuration: QLOO_MODE=live requires QLOO_API_KEY");
  }
}

/**
 * Dev-only flags (`ALLOW_MOCK_LLM`, `QLOO_FIXTURE_FAULTS`) are honoured only
 * when `VERCEL_ENV` is unset, so a stray variable cannot weaken a deployment.
 * An unhonoured `LLM_MODE=mock` is treated as unset and falls back to `gateway`.
 */
function resolveLlmMode(env: ServerEnv): ServerConfig["llmMode"] {
  if (env.llmMode !== "mock") return env.llmMode;
  return env.allowMockLlm && env.vercelEnv === undefined ? "mock" : "gateway";
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
export function getServerConfig(env: EnvSource = process.env): ServerConfig {
  const parsed = parseEnv(env);
  assertSafe(parsed);

  return {
    qlooMode: parsed.qlooMode,
    llmMode: resolveLlmMode(parsed),
    modelId: parsed.modelId,
    judgeModelId: parsed.judgeModelId,
    rateLimitMode: parsed.rateLimitMode,
    limits: resolveLimits(parsed),
    llmDailyCap: parsed.llmDailyCap,
    imageHosts: parsed.imageHosts,
    fixtureFaults: parsed.vercelEnv === undefined ? parsed.fixtureFaults : undefined,
  };
}
