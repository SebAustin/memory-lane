import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

const run = (path = "/", origin = "https://memory-lane.example") =>
  proxy(new NextRequest(`${origin}${path}`));
const csp = (res: Response) => res.headers.get("content-security-policy") ?? "";
const nonceOf = (res: Response) => /'nonce-([^']+)'/.exec(csp(res))?.[1];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy security headers (NFR-16)", () => {
  it("sets every security header on a response", () => {
    const res = run();

    expect(res.headers.get("strict-transport-security")).toBe(
      "max-age=31536000; includeSubDomains; preload",
    );
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    const permissions = res.headers.get("permissions-policy") ?? "";
    for (const feature of ["camera", "microphone", "geolocation"]) {
      expect(permissions).toContain(`${feature}=()`);
    }
    expect(csp(res)).not.toBe("");
  });

  it("emits the exact PLAN section 7 production policy", () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = run();
    const nonce = nonceOf(res);

    expect(nonce).toBeTruthy();
    expect(csp(res)).toBe(
      [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "frame-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ].join("; "),
    );
  });

  it("uses a different nonce for every request", () => {
    const nonces = new Set(Array.from({ length: 50 }, () => nonceOf(run())));

    expect(nonces.size).toBe(50);
  });

  it("adds QLOO_IMAGE_HOSTS to img-src and drops unsafe entries", () => {
    vi.stubEnv("QLOO_IMAGE_HOSTS", "images.qloo.com, evil.com; script-src *");

    const imgSrc = /img-src ([^;]+)/.exec(csp(run()))?.[1];

    expect(imgSrc).toBe("'self' data: blob: images.qloo.com");
    expect(csp(run())).not.toContain("evil.com");
  });

  it("allows unsafe-eval only in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(csp(run())).toContain("'unsafe-eval'");

    vi.stubEnv("NODE_ENV", "production");
    expect(csp(run())).not.toContain("'unsafe-eval'");
  });

  it("drops upgrade-insecure-requests only for plain-http loopback (WebKit would break local runs)", () => {
    for (const origin of ["http://localhost:3100", "http://127.0.0.1:3100", "http://[::1]:3100"]) {
      expect(csp(run("/", origin)), origin).not.toContain("upgrade-insecure-requests");
    }
  });

  it("keeps upgrade-insecure-requests for every other origin, even http ones", () => {
    for (const origin of [
      "https://memory-lane.example",
      "https://localhost:3100",
      "http://memory-lane.example",
      "http://localhost.evil.example",
    ]) {
      expect(csp(run("/", origin)), origin).toContain("upgrade-insecure-requests");
    }
  });
});
