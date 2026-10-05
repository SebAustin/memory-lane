import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { cspViolations, watchCsp } from "./support/csp";

/**
 * Your data (FR-26, FR-27, SC-10, SC-12): export, delete all and import through
 * the real UI, in a real browser, with no cookies at any point (NFR-10).
 */

const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const yourData = (page: Page) => page.getByRole("region", { name: "Your data" });

/** Step 1 of the wizard saves a draft to IndexedDB: a real, user-made record to export. */
async function saveADraft(page: Page) {
  await page.goto("/intake");
  await page.getByLabel("First name").fill("Margaret");
  await page.getByLabel("Year they were born").fill("1946");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/step=2/);
}

async function exportFile(page: Page): Promise<{ path: string; json: { app: string; data: { draft: { values: { firstName: string } } } } }> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    yourData(page).getByRole("button", { name: "Export everything" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^memory-lane-export-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  return { path, json: JSON.parse(await readFile(path, "utf8")) };
}

test.describe("Your data", () => {
  test("export, delete all, then import restores the draft exactly, with no cookies (SC-10)", async ({ page, context }) => {
    await watchCsp(page);
    await saveADraft(page);

    await page.goto("/about#privacy");
    await expect(yourData(page)).toBeVisible();
    const exported = await exportFile(page);
    expect(exported.json).toMatchObject({ app: "memory-lane", schemaVersion: 1 });
    expect(exported.json.data.draft.values.firstName).toBe("Margaret");

    await yourData(page).getByRole("button", { name: "Delete all data" }).click();
    const confirm = page.getByRole("dialog", { name: "Delete all data?" });
    await expect(confirm).toContainText("Export first if you want a copy.");
    await confirm.getByRole("button", { name: "Delete everything" }).click();
    await expect(yourData(page).getByText("Everything has been removed from this device.")).toBeVisible();

    await page.goto("/intake");
    await expect(page).toHaveURL(/step=1/);
    await expect(page.getByLabel("First name")).toHaveValue("");

    await page.goto("/about#privacy");
    await yourData(page).getByLabel("Memory Lane export file").setInputFiles(exported.path);
    const replace = page.getByRole("dialog", { name: "Replace everything on this device?" });
    await expect(replace).toContainText("Importing replaces what is here now");
    await replace.getByRole("button", { name: "Replace everything" }).click();
    await expect(yourData(page).getByText(/^Imported 0 Life Stories, 0 Kits and 0 Session Logs/)).toBeVisible();

    await page.goto("/intake");
    await expect(page).toHaveURL(/step=2/);
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel("First name")).toHaveValue("Margaret");
    await expect(page.getByLabel("Year they were born")).toHaveValue("1946");

    expect(await context.cookies()).toEqual([]);
    expect(await cspViolations(page)).toEqual([]);
  });

  test("a file that is not a Memory Lane export is turned away and nothing changes (SC-12)", async ({ page }) => {
    await saveADraft(page);
    await page.goto("/about#privacy");

    await yourData(page).getByLabel("Memory Lane export file").setInputFiles({
      name: "notes.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"hello":"world"}'),
    });

    await expect(yourData(page).getByRole("alert")).toContainText("doesn't look like a Memory Lane export");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goto("/intake");
    await expect(page).toHaveURL(/step=2/);
  });

  test("a file over 512 KB is rejected with a clear message", async ({ page }) => {
    await page.goto("/about#privacy");

    await yourData(page).getByLabel("Memory Lane export file").setInputFiles({
      name: "big.json",
      mimeType: "application/json",
      buffer: Buffer.alloc(512 * 1024 + 1, 0x20),
    });

    await expect(yourData(page).getByRole("alert")).toContainText("larger than 512 KB");
  });

  test("Delete all asks first, and Cancel or Esc keeps the data and returns focus", async ({ page }) => {
    await saveADraft(page);
    await page.goto("/about#privacy");
    const trigger = yourData(page).getByRole("button", { name: "Delete all data" });

    await trigger.focus();
    await page.keyboard.press("Enter");
    const confirm = page.getByRole("dialog", { name: "Delete all data?" });
    await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(confirm).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await expect(confirm).toBeHidden();
    await page.goto("/intake");
    await expect(page).toHaveURL(/step=2/);
  });

  test("is reachable from the top bar and the intake privacy note", async ({ page }) => {
    await page.goto("/intake");
    await page.getByRole("link", { name: "Export or delete it any time." }).click();
    await expect(page).toHaveURL(/\/about#privacy$/);
    await expect(heading(page)).toHaveText("How Memory Lane works");

    await page.goto("/");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Your data" }).click();
    await expect(yourData(page)).toBeVisible();
  });
});
