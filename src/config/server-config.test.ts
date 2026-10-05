import { describe, expect, it, vi } from "vitest";
import type { LogEvent } from "../lib/log";
import { getServerConfig } from "./server-config";

/** A logger that records what it was asked to log. */
const recorder = () => {
  const events: LogEvent[] = [];
  return { events, log: vi.fn((event: LogEvent) => void events.push(event)) };
};

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
  it("throws when RATE_LIMIT_MODE=off while deployed (preview or production)", () => {
    for (const vercelEnv of ["preview", "production"]) {
      expect(() =>
        getServerConfig({ RATE_LIMIT_MODE: "off", VERCEL_ENV: vercelEnv }, vi.fn()),
      ).toThrow(/RATE_LIMIT_MODE=off/);
    }
  });

  it("allows RATE_LIMIT_MODE=off locally, including under `vercel dev` (E2E)", () => {
    expect(getServerConfig({ RATE_LIMIT_MODE: "off" }).rateLimitMode).toBe("off");
    expect(
      getServerConfig({ RATE_LIMIT_MODE: "off", VERCEL_ENV: "development" }).rateLimitMode,
    ).toBe("off");
  });

  it("treats RATE_LIMIT_MODE=on with VERCEL_ENV set as normal", () => {
    expect(getServerConfig({ VERCEL_ENV: "production" }).rateLimitMode).toBe("on");
  });

  it("rejects a VERCEL_ENV value it does not know, so nothing sneaks past the deployed check", () => {
    expect(() => getServerConfig({ VERCEL_ENV: "staging" })).toThrow(/VERCEL_ENV/);
  });

  it("treats an empty VERCEL_ENV as unset (the E2E servers force it empty)", () => {
    expect(getServerConfig({ VERCEL_ENV: "", RATE_LIMIT_MODE: "off" }).rateLimitMode).toBe("off");
  });

  it("accepts live Qloo mode only with a key, and carries the key only then", () => {
    expect(() => getServerConfig({ QLOO_MODE: "live" })).toThrow(/QLOO_MODE=live needs QLOO_API_KEY/);
    const live = getServerConfig({ QLOO_MODE: "live", QLOO_API_KEY: "k" });
    expect(live.qlooMode).toBe("live");
    expect(live.qlooApiKey).toBe("k");
    expect(getServerConfig({ QLOO_API_KEY: "k" }).qlooApiKey).toBeUndefined();
  });

  it("never echoes the Qloo key in a live-mode refusal", () => {
    try {
      getServerConfig({ QLOO_MODE: "live", QLOO_API_KEY: "sk-live-secret", RATE_LIMIT_MODE: "off", VERCEL_ENV: "production" });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(String(error)).not.toContain("sk-live-secret");
    }
  });
});

describe("QLOO_BASE_URL (L6)", () => {
  it("defaults to the hackathon host", () => {
    expect(getServerConfig({}).qlooBaseUrl).toBe("https://hackathon.api.qloo.com");
  });

  it("accepts an https origin, normalized to the bare origin", () => {
    expect(getServerConfig({ QLOO_BASE_URL: "https://Example.Qloo.com/" }).qlooBaseUrl).toBe(
      "https://example.qloo.com",
    );
  });

  it.each([
    ["not https", "http://hackathon.api.qloo.com"],
    ["a port", "https://hackathon.api.qloo.com:8443"],
    ["credentials", "https://user:pass@hackathon.api.qloo.com"],
    ["a path", "https://hackathon.api.qloo.com/v2"],
    ["a query", "https://hackathon.api.qloo.com/?a=1"],
    ["a fragment", "https://hackathon.api.qloo.com/#x"],
    ["not a URL", "hackathon.api.qloo.com"],
  ])("rejects a base URL with %s, without echoing it", (_label, value) => {
    try {
      getServerConfig({ QLOO_BASE_URL: value });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(String(error)).toMatch(/QLOO_BASE_URL/);
      expect(String(error)).not.toContain("pass");
    }
  });
});

describe("QLOO_IMAGE_HOSTS duplicates (L6)", () => {
  it("rejects a host listed twice, even in a different case", () => {
    expect(() => getServerConfig({ QLOO_IMAGE_HOSTS: "images.qloo.com,Images.Qloo.com" })).toThrow(
      /QLOO_IMAGE_HOSTS lists the same host twice/,
    );
  });

  it("still folds case on a single entry", () => {
    expect(getServerConfig({ QLOO_IMAGE_HOSTS: "Images.Qloo.com" }).imageHosts).toEqual(["images.qloo.com"]);
  });
});

describe("getServerConfig dev-only flags", () => {
  it("honours LLM_MODE=mock only with ALLOW_MOCK_LLM=1 and not deployed", () => {
    expect(getServerConfig({ LLM_MODE: "mock", ALLOW_MOCK_LLM: "1" }).llmMode).toBe("mock");
    expect(
      getServerConfig({ LLM_MODE: "mock", ALLOW_MOCK_LLM: "1", VERCEL_ENV: "development" }).llmMode,
    ).toBe("mock");
  });

  it("throws, instead of falling back to the gateway, on LLM_MODE=mock without ALLOW_MOCK_LLM", () => {
    expect(() => getServerConfig({ LLM_MODE: "mock" })).toThrow(/LLM_MODE=mock/);
    expect(() => getServerConfig({ LLM_MODE: "mock", ALLOW_MOCK_LLM: "0" })).toThrow(/LLM_MODE=mock/);
  });

  it("throws on LLM_MODE=mock when deployed, even with ALLOW_MOCK_LLM=1", () => {
    for (const vercelEnv of ["preview", "production"]) {
      expect(() =>
        getServerConfig({ LLM_MODE: "mock", ALLOW_MOCK_LLM: "1", VERCEL_ENV: vercelEnv }),
      ).toThrow(/LLM_MODE=mock/);
    }
  });

  it("keeps LLM_MODE=off regardless of VERCEL_ENV", () => {
    expect(getServerConfig({ LLM_MODE: "off", VERCEL_ENV: "production" }).llmMode).toBe("off");
  });

  it("honours QLOO_FIXTURE_FAULTS unless deployed", () => {
    expect(getServerConfig({ QLOO_FIXTURE_FAULTS: "all" }).fixtureFaults).toBe("all");
    expect(
      getServerConfig({ QLOO_FIXTURE_FAULTS: "all", VERCEL_ENV: "development" }).fixtureFaults,
    ).toBe("all");
    expect(
      getServerConfig({ QLOO_FIXTURE_FAULTS: "all", VERCEL_ENV: "production" }, vi.fn()).fixtureFaults,
    ).toBeUndefined();
  });

  it("logs each dev flag a deployment ignores, by name and never by value", () => {
    const { events, log } = recorder();

    getServerConfig(
      { ALLOW_MOCK_LLM: "1", QLOO_FIXTURE_FAULTS: "book:500-secretish", VERCEL_ENV: "production" },
      log,
    );

    expect(events).toEqual([
      { event: "config.dev_flag_ignored", level: "warn", flag: "ALLOW_MOCK_LLM" },
      { event: "config.dev_flag_ignored", level: "warn", flag: "QLOO_FIXTURE_FAULTS" },
    ]);
    expect(JSON.stringify(events)).not.toContain("secretish");
  });

  it("logs nothing for dev flags when running locally or when none are set", () => {
    const { events, log } = recorder();

    getServerConfig({ ALLOW_MOCK_LLM: "1", QLOO_FIXTURE_FAULTS: "all" }, log);
    getServerConfig({ VERCEL_ENV: "production" }, log);

    expect(events).toEqual([]);
  });
});
