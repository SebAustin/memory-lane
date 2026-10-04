import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a production build (PLAN section 8.1). `pnpm test:e2e`
 * runs `next build` first; the web servers below only `next start` it.
 * Two servers share that build: one with rate limits off for the golden path,
 * one with limits on for the `limits` project.
 */
const MAIN_PORT = 3100;
const LIMITS_PORT = 3101;

const baseEnv = {
  QLOO_MODE: "fixture",
  LLM_MODE: "mock",
  ALLOW_MOCK_LLM: "1",
  // The mock LLM and RATE_LIMIT_MODE=off are refused when deployed (A31).
  // Force "not deployed" even if the developer's shell carries a VERCEL_ENV.
  VERCEL_ENV: "",
};

const server = (port: number, rateLimitMode: "on" | "off") => ({
  command: `pnpm exec next start -p ${port}`,
  url: `http://localhost:${port}`,
  env: { ...baseEnv, RATE_LIMIT_MODE: rateLimitMode },
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
});

const mainBaseURL = `http://localhost:${MAIN_PORT}`;
const notRateLimit = /ratelimit\.spec\.ts$/;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: mainBaseURL, trace: "on-first-retry" },
  projects: [
    {
      name: "phone",
      testIgnore: notRateLimit,
      use: { ...devices["Pixel 5"], viewport: { width: 375, height: 812 } },
    },
    {
      name: "tablet",
      testIgnore: notRateLimit,
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
    {
      name: "ipad",
      testIgnore: notRateLimit,
      use: { ...devices["iPad (gen 7)"] },
    },
    {
      name: "desktop",
      testIgnore: notRateLimit,
      use: { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "limits",
      testMatch: notRateLimit,
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${LIMITS_PORT}` },
    },
  ],
  webServer: [server(MAIN_PORT, "off"), server(LIMITS_PORT, "on")],
});
