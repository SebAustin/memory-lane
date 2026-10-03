import { expect, test } from "@playwright/test";

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
    const violations: string[] = [];
    page.on("console", (msg) => {
      if (/content security policy/i.test(msg.text())) violations.push(msg.text());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(violations).toEqual([]);
  });
});
