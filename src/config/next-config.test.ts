import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** `next.config.ts` validates the environment when it loads (H1). */
describe("next.config.ts boot-time validation", () => {
  it("loads with a clean environment", async () => {
    vi.stubEnv("QLOO_MODE", "fixture");
    const loaded = await import("../../next.config");
    expect(loaded.default.poweredByHeader).toBe(false);
  });

  it.each([
    ["live Qloo mode", { QLOO_MODE: "live", QLOO_API_KEY: "k" }, /QLOO_MODE=live/],
    ["a refused mock LLM", { LLM_MODE: "mock" }, /LLM_MODE=mock/],
    ["rate limits off in a deployment", { RATE_LIMIT_MODE: "off", VERCEL_ENV: "production" }, /RATE_LIMIT_MODE=off/],
    ["a malformed variable", { LLM_DAILY_RUN_CAP: "lots" }, /LLM_DAILY_RUN_CAP/],
  ])("fails the build for %s", async (_label, env, message) => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    await expect(import("../../next.config")).rejects.toThrow(message);
  });
});
