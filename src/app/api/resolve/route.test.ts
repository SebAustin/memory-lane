import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const post = (query = "Patsy Cline") =>
  new Request("http://localhost/api/resolve", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
    body: JSON.stringify({ kind: "entity", query }),
  });

describe("POST /api/resolve route", () => {
  it("resolves a Seed in fixture mode", async () => {
    vi.stubEnv("QLOO_MODE", "fixture");
    vi.stubEnv("RATE_LIMIT_MODE", "off");
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe("ok");
  });

  it("answers a JSON 500, not a bare error page, when the environment is bad", async () => {
    // An unsafe base URL (http) whose text must never be echoed back.
    vi.stubEnv("QLOO_BASE_URL", "http://sk-live-secret.example.com");
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const res = await POST(post());
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(JSON.parse(text)).toEqual({
      error: "server_misconfigured",
      message: "The server is not set up correctly.",
    });
    expect(text).not.toContain("sk-live-secret");
    expect(JSON.parse(String(spy.mock.calls[0]?.[0])).event).toBe("resolve.config_error");
  });

  it("shares one limiter across requests, so the bucket really fills", async () => {
    vi.stubEnv("QLOO_MODE", "fixture");
    vi.stubEnv("RL_RESOLVE", "2/1");
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const statuses = [(await POST(post())).status, (await POST(post())).status, (await POST(post())).status];

    expect(statuses).toEqual([200, 200, 429]);
  });
});
