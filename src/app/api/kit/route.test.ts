import { afterEach, describe, expect, it, vi } from "vitest";
import { margaretKitRequest } from "@/demo/margaret";
import { POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const post = () =>
  new Request("http://localhost/api/kit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(margaretKitRequest()),
  });

describe("POST /api/kit route", () => {
  it("serves the interim Kit in fixture mode", async () => {
    vi.stubEnv("QLOO_MODE", "fixture");
    expect((await POST(post())).status).toBe(200);
  });

  it("answers a JSON 500, not a bare error page, when the environment is bad", async () => {
    // An unsafe base URL (http) whose text must never be echoed back.
    vi.stubEnv("QLOO_BASE_URL", "http://sk-live-secret.example.com");
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const res = await POST(post());
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(JSON.parse(text)).toEqual({
      error: "server_misconfigured",
      message: "The server is not set up correctly.",
    });
    expect(text).not.toContain("sk-live-secret");
    expect(JSON.parse(String(spy.mock.calls[0]?.[0])).event).toBe("kit.config_error");
  });
});
