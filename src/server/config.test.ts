import { describe, expect, it } from "vitest";
import { getServerConfig } from "./config";

describe("getServerConfig defaults", () => {
  it("runs a clean clone in fixture mode with no keys (NFR-22)", () => {
    const config = getServerConfig({});

    expect(config.qlooMode).toBe("fixture");
    expect(config.llmMode).toBe("gateway");
    expect(config.rateLimitMode).toBe("on");
    expect(config.llmDailyCap).toBe(150);
    expect(config.modelId).toBe("anthropic/claude-sonnet-5.5");
    expect(config.judgeModelId).toBe("openai/gpt-5.6-sol");
    expect(config.imageHosts).toEqual([]);
  });

  it("ships the PLAN section 3.4 limits table", () => {
    expect(getServerConfig({}).limits).toEqual({
      resolve: { capacity: 60, perMinutes: 1 },
      kitLive: { capacity: 6, perMinutes: 10 },
      kitReplay: { capacity: 30, perMinutes: 10 },
      baselineLive: { capacity: 6, perMinutes: 10 },
      baselineReplay: { capacity: 30, perMinutes: 10 },
      compare: { capacity: 10, perMinutes: 10 },
    });
  });
});

describe("getServerConfig overrides and validation", () => {
  it("applies RL_<BUCKET> overrides to one bucket only", () => {
    const config = getServerConfig({ RL_KIT_LIVE: "2/5", RL_BASELINE_REPLAY: "99/1" });

    expect(config.limits.kitLive).toEqual({ capacity: 2, perMinutes: 5 });
    expect(config.limits.baselineReplay).toEqual({ capacity: 99, perMinutes: 1 });
    expect(config.limits.resolve).toEqual({ capacity: 60, perMinutes: 1 });
  });

  it.each(["abc", "6", "0/10", "6/0", "6/10/1", "-1/5"])(
    "rejects the malformed limit override %j",
    (value) => {
      expect(() => getServerConfig({ RL_COMPARE: value })).toThrow(/RL_COMPARE/);
    },
  );

  it("honours LLM_DAILY_RUN_CAP and model ids", () => {
    const config = getServerConfig({
      LLM_DAILY_RUN_CAP: "20",
      MODEL_ID: "anthropic/other",
      JUDGE_MODEL_ID: "openai/judge",
    });

    expect(config.llmDailyCap).toBe(20);
    expect(config.modelId).toBe("anthropic/other");
    expect(config.judgeModelId).toBe("openai/judge");
  });

  it("rejects unknown modes instead of guessing", () => {
    expect(() => getServerConfig({ QLOO_MODE: "yolo" })).toThrow(/QLOO_MODE/);
    expect(() => getServerConfig({ LLM_MODE: "yolo" })).toThrow(/LLM_MODE/);
  });

  it("treats empty values copied from .env.example as unset", () => {
    const config = getServerConfig({ QLOO_MODE: "", QLOO_API_KEY: "", LLM_DAILY_RUN_CAP: "" });

    expect(config.qlooMode).toBe("fixture");
    expect(config.llmDailyCap).toBe(150);
  });

  it("parses QLOO_IMAGE_HOSTS and rejects CSP-injecting entries", () => {
    expect(getServerConfig({ QLOO_IMAGE_HOSTS: "Images.Qloo.com, *.cdn.example.org" }).imageHosts)
      .toEqual(["images.qloo.com", "*.cdn.example.org"]);
    expect(() => getServerConfig({ QLOO_IMAGE_HOSTS: "a.com; script-src *" })).toThrow(
      /QLOO_IMAGE_HOSTS/,
    );
  });

  it("never echoes secret values in error messages", () => {
    const secret = "sk-super-secret-value";
    try {
      getServerConfig({ QLOO_API_KEY: secret, QLOO_MODE: "nope" });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});

describe("getServerConfig refuses unsafe combinations (R5, A31, SC-12)", () => {
  it("throws when RATE_LIMIT_MODE=off while VERCEL_ENV is set", () => {
    for (const vercelEnv of ["preview", "production", "development"]) {
      expect(() =>
        getServerConfig({ RATE_LIMIT_MODE: "off", VERCEL_ENV: vercelEnv }),
      ).toThrow(/RATE_LIMIT_MODE=off/);
    }
  });

  it("allows RATE_LIMIT_MODE=off locally (E2E)", () => {
    expect(getServerConfig({ RATE_LIMIT_MODE: "off" }).rateLimitMode).toBe("off");
  });

  it("treats RATE_LIMIT_MODE=on with VERCEL_ENV set as normal", () => {
    expect(getServerConfig({ VERCEL_ENV: "production" }).rateLimitMode).toBe("on");
  });

  it("makes live Qloo mode without QLOO_API_KEY a boot error", () => {
    expect(() => getServerConfig({ QLOO_MODE: "live" })).toThrow(/QLOO_API_KEY/);
    expect(() => getServerConfig({ QLOO_MODE: "live", QLOO_API_KEY: "  " })).toThrow(
      /QLOO_API_KEY/,
    );
  });

  it("accepts live Qloo mode with a key", () => {
    expect(getServerConfig({ QLOO_MODE: "live", QLOO_API_KEY: "k" }).qlooMode).toBe("live");
  });
});

describe("getServerConfig dev-only flags", () => {
  it("honours LLM_MODE=mock only with ALLOW_MOCK_LLM=1 and no VERCEL_ENV", () => {
    expect(getServerConfig({ LLM_MODE: "mock", ALLOW_MOCK_LLM: "1" }).llmMode).toBe("mock");
  });

  it("ignores LLM_MODE=mock without ALLOW_MOCK_LLM", () => {
    expect(getServerConfig({ LLM_MODE: "mock" }).llmMode).toBe("gateway");
  });

  it("ignores ALLOW_MOCK_LLM when VERCEL_ENV is set", () => {
    const config = getServerConfig({
      LLM_MODE: "mock",
      ALLOW_MOCK_LLM: "1",
      VERCEL_ENV: "preview",
    });

    expect(config.llmMode).toBe("gateway");
  });

  it("keeps LLM_MODE=off regardless of VERCEL_ENV", () => {
    expect(getServerConfig({ LLM_MODE: "off", VERCEL_ENV: "production" }).llmMode).toBe("off");
  });

  it("honours QLOO_FIXTURE_FAULTS only when VERCEL_ENV is unset", () => {
    expect(getServerConfig({ QLOO_FIXTURE_FAULTS: "all" }).fixtureFaults).toBe("all");
    expect(
      getServerConfig({ QLOO_FIXTURE_FAULTS: "all", VERCEL_ENV: "production" }).fixtureFaults,
    ).toBeUndefined();
  });
});
