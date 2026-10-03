/**
 * Per-instance rate-limit buckets (PLAN section 3.4). Pure data with no
 * server-only imports so both env parsing and the limiter can share it.
 */
export const BUCKET_NAMES = [
  "resolve",
  "kitLive",
  "kitReplay",
  "baselineLive",
  "baselineReplay",
  "compare",
] as const;

export type BucketName = (typeof BUCKET_NAMES)[number];

export interface RateLimit {
  readonly capacity: number;
  readonly perMinutes: number;
}

export const DEFAULT_LIMITS: Readonly<Record<BucketName, RateLimit>> = {
  resolve: { capacity: 60, perMinutes: 1 },
  kitLive: { capacity: 6, perMinutes: 10 },
  kitReplay: { capacity: 30, perMinutes: 10 },
  baselineLive: { capacity: 6, perMinutes: 10 },
  baselineReplay: { capacity: 30, perMinutes: 10 },
  compare: { capacity: 10, perMinutes: 10 },
};

/** `kitLive` -> `RL_KIT_LIVE`: the env var that overrides a bucket. */
export function limitEnvVar(bucket: BucketName): string {
  return `RL_${bucket.replace(/([A-Z])/g, "_$1").toUpperCase()}`;
}
