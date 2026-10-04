import { z } from "zod";
import { parseImageHosts } from "./image-hosts";
import { BUCKET_NAMES, limitEnvVar, type BucketName, type RateLimit } from "./limits";

/** Thrown for any invalid or unsafe environment. Messages never echo values. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** Any string map; `process.env` qualifies, and tests can pass plain objects. */
export type EnvSource = Readonly<Record<string, string | undefined>>;

const text = z.string().trim().min(1);

const limitOverride = z
  .string()
  .regex(/^\d+\/\d+$/, "expected <capacity>/<perMinutes>, e.g. 6/10")
  .transform((raw): RateLimit => {
    const [capacity, perMinutes] = raw.split("/").map(Number);
    return { capacity, perMinutes };
  })
  .refine((l) => l.capacity > 0 && l.perMinutes > 0, "both numbers must be > 0");

const limitShape = Object.fromEntries(
  BUCKET_NAMES.map((b) => [limitEnvVar(b), limitOverride.optional()]),
) as Record<string, z.ZodOptional<typeof limitOverride>>;

const envSchema = z.object({
  QLOO_MODE: z.enum(["fixture", "live"]).default("fixture"),
  QLOO_API_KEY: text.optional(),
  QLOO_BASE_URL: z.url().optional(),
  LLM_MODE: z.enum(["gateway", "mock", "off"]).default("gateway"),
  MODEL_ID: text.default("anthropic/claude-sonnet-5.5"),
  JUDGE_MODEL_ID: text.default("openai/gpt-5.6-sol"),
  AI_GATEWAY_API_KEY: text.optional(),
  LLM_DAILY_RUN_CAP: z.coerce.number().int().min(0).max(100_000).default(150),
  RATE_LIMIT_MODE: z.enum(["on", "off"]).default("on"),
  QLOO_IMAGE_HOSTS: z.string().optional(),
  ALLOW_MOCK_LLM: z.enum(["0", "1"]).optional(),
  QLOO_FIXTURE_FAULTS: text.optional(),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  ...limitShape,
});

export interface ServerEnv {
  readonly qlooMode: "fixture" | "live";
  readonly qlooApiKey: string | undefined;
  readonly llmMode: "gateway" | "mock" | "off";
  readonly modelId: string;
  readonly judgeModelId: string;
  readonly llmDailyCap: number;
  readonly rateLimitMode: "on" | "off";
  readonly imageHosts: readonly string[];
  readonly allowMockLlm: boolean;
  readonly fixtureFaults: string | undefined;
  readonly vercelEnv: "development" | "preview" | "production" | undefined;
  readonly limitOverrides: Readonly<Partial<Record<BucketName, RateLimit>>>;
}

/** Empty values (`KEY=` copied from .env.example) count as unset. */
function dropBlank(env: EnvSource): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && entry[1].trim() !== "",
    ),
  );
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "env"}: ${i.message}`)
    .join("; ");
}

/**
 * Validates `env` at the boundary and returns a typed, immutable view.
 * Throws {@link ConfigError} listing the offending variable names (never values).
 */
export function parseEnv(env: EnvSource): ServerEnv {
  const parsed = envSchema.safeParse(dropBlank(env));
  if (!parsed.success) {
    throw new ConfigError(`Invalid environment: ${describeIssues(parsed.error)}`);
  }
  const raw = parsed.data as Record<string, unknown> & z.infer<typeof envSchema>;

  const hosts = parseImageHosts(raw.QLOO_IMAGE_HOSTS);
  if (hosts.invalid.length > 0) {
    throw new ConfigError(
      "Invalid environment: QLOO_IMAGE_HOSTS must be comma-separated bare hostnames",
    );
  }

  const limitOverrides = Object.fromEntries(
    BUCKET_NAMES.flatMap((b) => {
      const value = raw[limitEnvVar(b)] as RateLimit | undefined;
      return value ? [[b, value]] : [];
    }),
  );

  return {
    qlooMode: raw.QLOO_MODE,
    qlooApiKey: raw.QLOO_API_KEY,
    llmMode: raw.LLM_MODE,
    modelId: raw.MODEL_ID,
    judgeModelId: raw.JUDGE_MODEL_ID,
    llmDailyCap: raw.LLM_DAILY_RUN_CAP,
    rateLimitMode: raw.RATE_LIMIT_MODE,
    imageHosts: hosts.hosts,
    allowMockLlm: raw.ALLOW_MOCK_LLM === "1",
    fixtureFaults: raw.QLOO_FIXTURE_FAULTS,
    vercelEnv: raw.VERCEL_ENV,
    limitOverrides,
  };
}
