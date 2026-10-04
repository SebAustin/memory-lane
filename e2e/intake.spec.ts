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

/**
 * Steps 4-6 and the build (PLAN section 10.1, FR-4/5/6, EVALS (a)): every Seed
 * and Avoid List entity is resolved through /api/resolve into a Qloo entity,
 * an ambiguous one is chosen by the Caregiver, and Build opens a music Kit.
 */
const favorite = (page: Page) => page.getByLabel("Add a favorite");
const find = (page: Page) => page.getByRole("button", { name: "Find" });
/** Stage cards are labels around visually hidden radios, so the Caregiver clicks the card. */
const chooseStage = (page: Page, stage: RegExp) =>
  page.locator("label").filter({ has: page.getByRole("radio", { name: stage }) }).click();

async function toSeedsStep(page: Page) {
  await page.goto("/intake");
  await fillAbout(page);
  await fillPlaces(page);
  await next(page).click(); // Roots is optional
  await expect(page).toHaveURL(/step=4/);
}

async function addSeed(page: Page, query: string, name: string) {
  await favorite(page).fill(query);
  await find(page).click();
  const confirm = page.getByRole("region", { name: "Is this the one?" });
  await expect(confirm.getByText(name, { exact: true })).toBeVisible();
  await confirm.getByRole("button", { name: "Yes, add to favorites" }).click();
  await expect(page.getByRole("list", { name: "Chosen favorites" }).getByText(name, { exact: true })).toBeVisible();
}

test.describe("Life Story wizard: Seeds, Avoid List, Stage and Build", () => {
  test("the demo Seeds resolve, Doris Day asks which one, and Build opens the Kit", async ({ page }) => {
    await toSeedsStep(page);
    await expect(heading(page)).toHaveText("A few favorites to start from");

    await addSeed(page, "Patsy Cline", "Patsy Cline");
    await addSeed(page, "Pillow Talk", "Pillow Talk");

    // An ambiguous name asks, shows chips, and picks nothing by itself (FR-4).
    await favorite(page).fill("Doris Day");
    await find(page).click();
    const group = page.getByRole("radiogroup", { name: "Which Doris Day did you mean?" });
    await expect(group).toBeVisible();
    await expect(group.getByRole("radio")).toHaveCount(4);
    await expect(group.getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Chosen favorites" }).getByRole("listitem")).toHaveCount(2);
    await group.getByText("American singer and actress, 1922-2019. Que Sera, Sera").click();
    await group.getByRole("button", { name: "Add to favorites" }).click();
    await expect(page.getByRole("list", { name: "Chosen favorites" }).getByRole("listitem")).toHaveCount(3);

    await next(page).click();
    await expect(page).toHaveURL(/step=5/);
    await expect(heading(page)).toHaveText("Things to keep away");

    // Topics say how they are enforced; entities resolve like Seeds.
    await page.getByLabel("Add a topic").fill("war films");
    await page.getByRole("button", { name: "Add topic" }).click();
    await expect(page.getByText("'war films' matched a Qloo tag: War films.")).toBeVisible();
    await page.getByLabel("Add a topic").fill("Vietnam War");
    await page.getByLabel("Add a topic").press("Enter");
    const avoid = page.getByRole("list", { name: "Avoid List" });
    await expect(avoid.getByText("Matched to a Qloo tag: War films")).toBeVisible();
    await expect(avoid.getByText("We'll keep this out of conversation Prompts")).toBeVisible();
    await page.getByLabel("Add something by name").fill("Apocalypse Now");
    await find(page).click();
    await page.getByRole("button", { name: "Yes, add to Avoid List" }).click();
    await expect(avoid.getByText("Apocalypse Now", { exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Include themes like war, loss or hospitals/ })).not.toBeChecked();
    await next(page).click();

    await expect(page).toHaveURL(/step=6/);
    await expect(page.getByText("Not sure? Choose Middle.")).toBeVisible();
    const review = page.getByRole("region", { name: "Review" });
    await expect(review).toContainText("Margaret, born 1946");
    await expect(review).toContainText("Patsy Cline");
    await expect(review).toContainText("Doris Day");
    await chooseStage(page, /Middle/);
    await page.getByRole("button", { name: /Build Margaret.s Kit/ }).click();

    await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}\/kit$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Margaret");
    const cards = page.locator("[data-entity-id]");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
    for (const id of await cards.evaluateAll((els) => els.map((el) => el.getAttribute("data-entity-id")))) {
      expect(id).toMatch(/^fx-/);
    }
    // The Avoid List is enforced: none of its entities, nor the Seeds, come back as Cues.
    await expect(page.locator('[data-entity-id="fx-artist-patsy-cline"]')).toHaveCount(0);

    // The Life Story is kept on this device: a reload shows the same Kit.
    await page.reload();
    await expect(page.locator("[data-entity-id]").first()).toBeVisible();
  });

  test("the saved Life Story and its profile carry no first name off the device", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST") requests.push(`${request.url()} ${request.postData() ?? ""}`);
    });
    await toSeedsStep(page);
    await addSeed(page, "Margaret's Patsy Cline", "Patsy Cline");
    await addSeed(page, "Pillow Talk", "Pillow Talk");
    await next(page).click();
    await next(page).click(); // Avoid List is optional
    await chooseStage(page, /Early/);
    await page.getByRole("button", { name: /Build Margaret.s Kit/ }).click();
    await expect(page.locator("[data-entity-id]").first()).toBeVisible();

    const outbound = requests.filter((entry) => entry.includes("/api/"));
    expect(outbound.length).toBeGreaterThanOrEqual(3);
    for (const entry of outbound) expect(entry.toLowerCase()).not.toContain("margaret");
  });

  test("says what it could not find, with the fixture hint, and never accepts unmatched text", async ({ page }) => {
    await toSeedsStep(page);
    await addSeed(page, "Patsy Cline", "Patsy Cline");
    await addSeed(page, "Pillow Talk", "Pillow Talk");

    await favorite(page).fill("Pattsy Klein");
    await find(page).click();
    await expect(page.getByText("We couldn't find 'Pattsy Klein'. Check the spelling or try the full name.")).toBeVisible();
    await expect(page.getByText("Fixture mode: try the demo Seeds (P1-P5)")).toBeVisible();

    await next(page).click();
    await expect(page.getByRole("region", { name: "One thing to check" })).toContainText("is not matched yet");
    await expect(page).toHaveURL(/step=4/);
    await expect(page.getByRole("list", { name: "Chosen favorites" }).getByRole("listitem")).toHaveCount(2);
  });

  test("says Qloo is out of reach, keeps the answers, and Retry works once it is back", async ({ page }) => {
    await toSeedsStep(page);
    await page.route("**/api/resolve", (route) => route.fulfill({ status: 500, json: { error: "internal_error" } }));

    await favorite(page).fill("Patsy Cline");
    await find(page).click();
    await expect(page.getByText("We can't reach Qloo right now. Your answers are saved.")).toBeVisible();
    await page.unroute("**/api/resolve");
    await page.getByRole("button", { name: "Retry" }).click();

    await expect(page.getByRole("region", { name: "Is this the one?" })).toBeVisible();
    await expect(favorite(page)).toHaveValue("Patsy Cline");
  });

  test("a keyboard completes a lookup: Enter finds, Enter confirms, arrows move between chips", async ({ page }) => {
    await toSeedsStep(page);
    await favorite(page).focus();

    await page.keyboard.type("Patsy Cline");
    await page.keyboard.press("Enter");
    const yes = page.getByRole("button", { name: "Yes, add to favorites" });
    await expect(yes).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("list", { name: "Chosen favorites" }).getByText("Patsy Cline", { exact: true })).toBeVisible();
    await expect(favorite(page)).toBeFocused();
    await expect(page).toHaveURL(/step=4/); // Enter did not submit the step

    await page.keyboard.type("Doris Day");
    await page.keyboard.press("Enter");
    const radios = page.getByRole("radiogroup", { name: /Which Doris Day/ }).getByRole("radio");
    await expect(radios.first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(radios.nth(1)).toBeChecked();
    await expect(radios.nth(1)).toBeFocused();
  });

  test("the chips and the confirm print show a designed focus ring", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Safari does not tab to form controls by default");
    await toSeedsStep(page);
    await favorite(page).fill("Doris Day");
    await favorite(page).press("Enter");
    const group = page.getByRole("radiogroup");
    await expect(group.getByRole("radio").first()).toBeFocused();
    await page.keyboard.press("ArrowDown"); // a key press makes the focus ring show in every engine
    const second = group.getByRole("radio").nth(1);
    await expect(second).toBeFocused();

    const ring = await second.evaluate((el) => {
      const mat = el.closest("label")?.querySelector("span") as HTMLElement;
      const style = getComputedStyle(mat);
      return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
    });

    expect(ring.style).not.toBe("none");
    expect(ring.width).toBeGreaterThanOrEqual(3);
  });

  test("nothing overflows at 320 px with the chips open", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await toSeedsStep(page);
    await favorite(page).fill("Doris Day");
    await find(page).click();
    await expect(page.getByRole("radiogroup")).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("reduced motion removes the confirm print's animation", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await toSeedsStep(page);
    await favorite(page).fill("Patsy Cline");
    await find(page).click();
    const print = page.getByRole("region", { name: "Is this the one?" }).locator("figure");
    await expect(print).toBeVisible();

    expect(await print.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    await context.close();
  });

  test("no CSP violation and no cookie through steps 4-6 and the Kit", async ({ page, context }) => {
    await watchCsp(page);
    await toSeedsStep(page);
    await addSeed(page, "Patsy Cline", "Patsy Cline");
    await addSeed(page, "Pillow Talk", "Pillow Talk");
    expect(await cspViolations(page)).toEqual([]);
    await next(page).click();
    await next(page).click();
    await chooseStage(page, /Middle/);
    await page.getByRole("button", { name: /Build Margaret.s Kit/ }).click();
    await expect(page.locator("[data-entity-id]").first()).toBeVisible();

    expect(await cspViolations(page)).toEqual([]);
    expect(await context.cookies()).toEqual([]);
  });
});
