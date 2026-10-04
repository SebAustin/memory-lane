import { expect, test } from "@playwright/test";
import { cspViolations, watchCsp } from "./support/csp";

test.describe("skeleton smoke", () => {
  test("serves the page with the security headers on every response", async ({ request }) => {
    const res = await request.get("/");

    expect(res.status()).toBe(200);
    const headers = res.headers();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["strict-transport-security"]).toContain("max-age=");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
  });

  test("stamps the per-request CSP nonce on scripts", async ({ request }) => {
    const res = await request.get("/");
    const nonce = /'nonce-([^']+)'/.exec(res.headers()["content-security-policy"])?.[1];
    const html = await res.text();

    expect(nonce).toBeTruthy();
    expect(html).toContain(`nonce="${nonce}"`);
  });

  test("hydrates without a single CSP violation", async ({ page }) => {
    await watchCsp(page);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(await cspViolations(page)).toEqual([]);
  });

  test("the CSP detector really sees a violation in this engine (guards against a silent no-op)", async ({ page }) => {
    await watchCsp(page);
    await page.goto("/");

    // `img-src` allows only our own origin, `data:`, `blob:` and allow-listed hosts, so an
    // image from anywhere else must be blocked (before any network request) and reported.
    await page.evaluate(() => {
      const image = new Image();
      image.src = "https://not-allow-listed.example/pixel.png";
    });

    // The event is queued as a task, so wait for it instead of reading straight away.
    await page.waitForFunction(() => (window.__csp?.length ?? 0) > 0);
    const violations = await cspViolations(page);
    expect(violations[0]?.directive).toContain("img-src");
  });
});
