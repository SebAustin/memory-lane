import { expect, test, type Page } from "@playwright/test";

/**
 * Golden path (PLAN section 8.2), the part ticket 02 owns: click 1.
 * Later tickets extend this file with clicks 2 to 7.
 */

const CUE = "[data-entity-id]";
const MARGARET_KIT = "/p/demo-margaret/kit";

function collectCspViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (/content security policy/i.test(msg.text())) violations.push(msg.text());
  });
  return violations;
}

test.describe("click 1: Meet Margaret", () => {
  test("the landing page offers both ways in as plain links", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Meet Margaret" })).toHaveAttribute("href", MARGARET_KIT);
    await expect(page.getByRole("link", { name: "Start a Life Story" })).toHaveAttribute("href", "/intake");
  });

  test("Meet Margaret lands on her Kit and shows 15 music Cues", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Meet Margaret" }).click();

    await expect(page).toHaveURL(/\/p\/demo-margaret\/kit$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Margaret.s Kit/);
    await expect(page.locator(CUE).first()).toBeVisible();
    await expect(page.locator(CUE)).toHaveCount(15);
  });

  test("every Cue is an article carrying a Qloo entity id", async ({ page }) => {
    await page.goto(MARGARET_KIT);

    const cards = page.locator(CUE);
    await expect(cards).toHaveCount(15);
    for (const tag of await cards.evaluateAll((els) => els.map((el) => el.tagName))) {
      expect(tag).toBe("ARTICLE");
    }
    const ids = await cards.evaluateAll((els) => els.map((el) => el.getAttribute("data-entity-id")));
    expect(new Set(ids).size).toBe(15);
    for (const id of ids) expect(id).toMatch(/^fx-/);
  });

  test("every picture has explicit width and height (SC-1, NFR-9)", async ({ page }) => {
    await page.goto(MARGARET_KIT);

    const pictures = page.locator(`${CUE} [data-cue-image]`);
    await expect(pictures).toHaveCount(15);
    const sizes = await pictures.evaluateAll((els) =>
      els.map((el) => [Number(el.getAttribute("width")), Number(el.getAttribute("height"))]),
    );
    for (const [width, height] of sizes) {
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    }
  });

  test("labels the data as fixture data", async ({ page }) => {
    await page.goto(MARGARET_KIT);
    await expect(page.getByRole("status").filter({ hasText: "Fixture data" })).toBeVisible();
  });

  test("Margaret's Life Story page names her Seeds and Avoid List", async ({ page }) => {
    await page.goto(MARGARET_KIT);

    const aside = page.getByRole("complementary");
    await expect(aside).toContainText("Born 1946");
    await expect(aside).toContainText("Memphis");
    await expect(aside).toContainText("Patsy Cline");
    await expect(aside.getByText("Avoid List: 2")).toBeVisible();
    await expect(aside).toContainText("1956 to 1976");
  });

  test("the footer carries the not-medical-advice line on both pages (FR-28)", async ({ page }) => {
    for (const path of ["/", MARGARET_KIT, "/intake"]) {
      await page.goto(path);
      await expect(page.getByRole("contentinfo")).toContainText("Suggestions only, not medical advice.");
    }
  });

  test("Start a Life Story reaches the intake stub", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Start a Life Story" }).click();

    await expect(page).toHaveURL(/\/intake$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Start a Life Story");
  });

  test("a story that lives on another device says so", async ({ page }) => {
    await page.goto("/p/3f1c2a9e-5b7d-4c1e-9a52-0d8f6e4b7a11/kit");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("lives on another device");
    expect((await page.request.get("/p/not-a-story/kit")).status()).toBe(404);
  });
});

test.describe("quality guards", () => {
  test("neither page triggers a CSP violation (no inline script, no external host)", async ({ page }) => {
    const violations = collectCspViolations(page);
    const external: string[] = [];
    page.on("request", (req) => {
      const url = new URL(req.url());
      if (!["localhost", "127.0.0.1"].includes(url.hostname) && url.protocol.startsWith("http")) {
        external.push(req.url());
      }
    });

    for (const path of ["/", MARGARET_KIT]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }

    expect(violations).toEqual([]);
    expect(external).toEqual([]);
  });

  test("nothing overflows horizontally down to 320 px", async ({ page }) => {
    for (const width of [320, 375, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", MARGARET_KIT]) {
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
      }
    }
  });

  test("the skip link is the first tab stop and reaches the main landmark", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Safari does not tab to links by default");
    await page.goto("/");
    await page.keyboard.press("Tab");

    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });

  test("keyboard focus is visible on the primary action", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Safari does not tab to links by default");
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Meet Margaret" });
    await cta.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");

    await expect(cta).toBeFocused();
    const outline = await cta.evaluate((el) => {
      const style = getComputedStyle(el);
      return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
    });
    expect(outline.style).not.toBe("none");
    expect(outline.width).toBeGreaterThanOrEqual(3);
  });

  test("reduced motion removes the entrance animations", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(MARGARET_KIT);

    const durations = await page
      .locator(CUE)
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));
    expect(new Set(durations)).toEqual(new Set(["none"]));
    await context.close();
  });

  test("the interim /api/kit handler rejects a body that carries the first name", async ({ request }) => {
    const res = await request.post("/api/kit", {
      data: { storyId: "demo-margaret", generation: 1, firstName: "Margaret" },
    });
    expect(res.status()).toBe(400);
  });
});
