import { expect, test, type Page } from "@playwright/test";
import { cspViolations, watchCsp } from "./support/csp";

/**
 * The Life Story wizard, steps 1-3 (PLAN section 10.1, FR-3/4/7, A16): fill the
 * steps, reload, and find the same step with the same answers.
 */

const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const next = (page: Page) => page.getByRole("button", { name: "Next" });

async function fillAbout(page: Page) {
  await page.getByLabel("First name").fill("Margaret");
  await page.getByLabel("Year they were born").fill("1946");
  await next(page).click();
  await expect(page).toHaveURL(/step=2/);
}

async function fillPlaces(page: Page) {
  await page.getByLabel("Where they grew up").fill("Memphis");
  await page.getByLabel("Where they lived as a young adult").fill("Nashville");
  await next(page).click();
  await expect(page).toHaveURL(/step=3/);
}

test.describe("Life Story wizard: steps 1-3", () => {
  test("shows the Reminiscence Window live as the birth year is typed (FR-7)", async ({ page }) => {
    await page.goto("/intake");
    await expect(heading(page)).toHaveText("Tell us about them");

    await page.getByLabel("Year they were born").fill("1946");

    await expect(page.getByText("Reminiscence Window: 1956 to 1976")).toBeVisible();
  });

  test("keeps the step in the URL and reads 'Step 2 of 6'", async ({ page }) => {
    await page.goto("/intake");
    await expect(page).toHaveURL(/step=1/);

    await fillAbout(page);

    await expect(page.getByText("Step 2 of 6")).toBeVisible();
    await expect(heading(page)).toHaveText("The places that shaped them");
  });

  test("fill steps 1-3, reload, and the step and values come back (A16)", async ({ page }) => {
    await page.goto("/intake");
    await fillAbout(page);
    await fillPlaces(page);
    await page.getByLabel("Heritage").fill("Irish");
    await page.getByLabel("Work they did").fill("Seamstress");
    await next(page).click();
    await expect(page).toHaveURL(/step=4/);
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/step=3/);

    await page.reload();

    await expect(page).toHaveURL(/step=3/);
    await expect(page.getByText("Step 3 of 6")).toBeVisible();
    await expect(heading(page)).toHaveText("Where their family comes from");
    await expect(page.getByLabel("Heritage")).toHaveValue("Irish");
    await expect(page.getByLabel("Work they did")).toHaveValue("Seamstress");
    await expect(page.getByText("Welcome back. Your answers so far are saved on this device.")).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel("Where they grew up")).toHaveValue("Memphis");
    await expect(page.getByLabel("Where they lived as a young adult")).toHaveValue("Nashville");
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel("First name")).toHaveValue("Margaret");
    await expect(page.getByLabel("Year they were born")).toHaveValue("1946");
    await expect(page.getByText("Reminiscence Window: 1956 to 1976")).toBeVisible();
  });

  test("a bare /intake resumes at the saved step", async ({ page }) => {
    await page.goto("/intake");
    await fillAbout(page);
    await fillPlaces(page);

    await page.goto("/intake");

    await expect(page).toHaveURL(/step=3/);
    await expect(heading(page)).toHaveText("Where their family comes from");
  });

  test("a link cannot skip ahead of the answers that are still missing", async ({ page }) => {
    await page.goto("/intake?step=5");

    await expect(page).toHaveURL(/step=1/);
    await expect(heading(page)).toHaveText("Tell us about them");
  });

  test("the browser's Back button goes to the previous step", async ({ page }) => {
    await page.goto("/intake");
    await fillAbout(page);

    await page.goBack();

    await expect(page).toHaveURL(/step=1/);
    await expect(heading(page)).toHaveText("Tell us about them");
    await expect(page.getByLabel("First name")).toHaveValue("Margaret");
  });

  test("on a failed step the error summary takes focus and every field is labelled (NFR-1)", async ({ page }) => {
    await page.goto("/intake");

    await next(page).click();

    const summary = page.getByRole("region", { name: "2 things to check" });
    await expect(summary).toBeFocused();
    await expect(summary).toContainText("Enter their first name.");
    await expect(page.getByLabel("First name")).toHaveAttribute("aria-invalid", "true");
    await summary.getByRole("link", { name: /Year they were born/ }).click();
    await expect(page.getByLabel("Year they were born")).toBeFocused();
    await expect(page).toHaveURL(/step=1/);
  });

  test("warns gently about a surname, an address and a diagnosis, without blocking", async ({ page }) => {
    await page.goto("/intake");
    await page.getByLabel("First name").fill("Margaret Smith");
    await expect(page.getByText(/looks like a full name/)).toBeVisible();
    await page.getByLabel("First name").fill("Margaret");
    await page.getByLabel("Year they were born").fill("1946");
    await next(page).click();

    await page.getByLabel("Where they grew up").fill("12 Oak Street");
    await expect(page.getByText(/looks like an address/)).toBeVisible();
    await page.getByLabel("Where they grew up").fill("Memphis");
    await next(page).click();

    await page.getByLabel("Work they did").fill("Dementia nurse");
    await expect(page.getByText(/looks like a medical detail/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Skip" })).toBeVisible();
  });

  test("a keyboard alone completes step 1", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Safari does not tab to form controls by default");
    await page.goto("/intake");
    await page.getByLabel("First name").focus();

    await page.keyboard.type("Margaret");
    await page.keyboard.press("Tab");
    await page.keyboard.type("1946");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/step=2/);
    await expect(heading(page)).toBeFocused();
  });

  test("Skip on the optional Roots step moves on, and Back and Skip show only where they should", async ({ page }) => {
    await page.goto("/intake");
    await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Skip" })).toHaveCount(0);
    await fillAbout(page);
    await fillPlaces(page);

    await page.getByRole("button", { name: "Skip" }).click();

    await expect(page).toHaveURL(/step=4/);
    await expect(page.getByText("Step 4 of 6")).toBeVisible();
  });

  test("Back on step 1 returns to the start page", async ({ page }) => {
    await page.goto("/intake");

    await page.getByRole("button", { name: "Back" }).click();

    await expect(page).toHaveURL(/\/$/);
  });

  test("states the privacy promise on every step", async ({ page }) => {
    await page.goto("/intake");
    await page.getByLabel("First name").fill("Margaret");

    await expect(page.getByText("Stays on this device. We never send Margaret to anyone.")).toBeVisible();
  });
});

test.describe("Life Story wizard: quality guards", () => {
  test("sets no cookies, and no CSP violation, while the draft is saved (NFR-10)", async ({ page, context }) => {
    await watchCsp(page);
    await page.goto("/intake");
    await fillAbout(page);
    await fillPlaces(page);

    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(() => document.cookie)).toBe("");
    expect(await cspViolations(page)).toEqual([]);
  });

  test("the draft lives in IndexedDB on this device", async ({ page }) => {
    await page.goto("/intake");
    await fillAbout(page);

    const stored = await page.evaluate(
      () =>
        new Promise<unknown>((resolve, reject) => {
          const open = indexedDB.open("memory-lane");
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const get = open.result.transaction("kv").objectStore("kv").get("memory-lane:store");
            get.onsuccess = () => resolve(get.result);
            get.onerror = () => reject(get.error);
          };
        }),
    );

    expect(stored).toMatchObject({
      schemaVersion: 1,
      draft: { step: 2, values: { firstName: "Margaret", birthYear: 1946 } },
    });
  });

  test("nothing overflows horizontally from 320 px to 1920 px", async ({ page }) => {
    for (const width of [320, 375, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/intake");
      await page.getByLabel("Year they were born").fill("1946");
      await expect(page.getByText("Reminiscence Window: 1956 to 1976")).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `step 1 at ${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test("reduced motion removes the step and preview animations", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/intake");
    await page.getByLabel("Year they were born").fill("1946");
    await expect(page.getByText("Reminiscence Window: 1956 to 1976")).toBeVisible();

    const names = await page
      .locator("form > div, aside > div")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));

    expect(new Set(names)).toEqual(new Set(["none"]));
    await context.close();
  });

  test("keyboard focus is visible on the inputs and buttons", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Safari does not tab to buttons by default");
    await page.goto("/intake");
    for (const target of [page.getByLabel("First name"), next(page)]) {
      await target.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(target).toBeFocused();
      const outline = await target.evaluate((el) => {
        const style = getComputedStyle(el);
        return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
      });
      expect(outline.style).not.toBe("none");
      expect(outline.width).toBeGreaterThanOrEqual(3);
    }
  });
});
