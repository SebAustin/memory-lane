// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useCallback, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LifeStoryDraft } from "@/contracts";
import { MIGRATIONS, STORE_KEY } from "@/lib/store/migrations";
import { createRepository, type Repository } from "@/lib/store/repository";
import { memoryStorage, type KeyValueStorage } from "@/lib/store/storage";
import { StoreProvider } from "@/lib/store/useStore";
import { IntakeWizard } from "./IntakeWizard";
import type { IntakeNav } from "./useIntakeNav";

/**
 * The URL is Next's job (and the e2e test's). Here a plain state variable plays
 * the address bar, seeded per test, so the wizard's own logic is what is tested.
 */
let startUrlStep: number | null = null;
const leave = vi.fn();
const openKit = vi.fn();
vi.mock("./useIntakeNav", () => ({
  useIntakeNav: (): IntakeNav => {
    const [requested, setRequested] = useState<number | null>(startUrlStep);
    const go = useCallback((step: number) => setRequested(step), []);
    return { requested, go, leave, openKit };
  },
}));

const NOW = "2026-10-03T12:00:00.000Z";

async function mount(storage: KeyValueStorage = memoryStorage()): Promise<{ repo: Repository; storage: KeyValueStorage }> {
  const repo = createRepository(storage, MIGRATIONS);
  render(
    <StoreProvider repository={repo}>
      <IntakeWizard />
    </StoreProvider>,
  );
  await screen.findByRole("heading", { level: 1, name: /.+/ }, { timeout: 2000 });
  await waitFor(() => expect(screen.queryByText(/Opening your draft/)).toBeNull());
  return { repo, storage };
}

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const next = () => fireEvent.click(screen.getByRole("button", { name: "Next" }));
const heading = () => screen.getByRole("heading", { level: 1 }).textContent;

async function fillStepOne() {
  type("First name", "Margaret");
  type(/Year they were born/, "1946");
  next();
  await screen.findByRole("heading", { level: 1, name: "The places that shaped them" });
}

beforeEach(() => {
  startUrlStep = null;
  leave.mockClear();
  openKit.mockClear();
});
afterEach(cleanup);

describe("step 1: About them", () => {
  it("opens on step 1 with real labels, Back, and no Skip", async () => {
    await mount();

    expect(screen.getByText("Step 1 of 6")).toBeTruthy();
    expect(heading()).toBe("Tell us about them");
    expect(screen.getByLabelText("First name")).toBeTruthy();
    expect(screen.getByLabelText(/Year they were born/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Skip" })).toBeNull();
    expect(screen.getByText(/Stays on this device/).textContent).toContain("We never send them to anyone.");
  });

  it("shows the Reminiscence Window as soon as the birth year is complete (FR-7)", async () => {
    await mount();
    expect(screen.queryByText(/Reminiscence Window: 1956/)).toBeNull();

    type(/Year they were born/, "194");
    expect(screen.queryByText("1956 to 1976")).toBeNull();
    type(/Year they were born/, "1946");

    expect(document.body.textContent).toContain("Reminiscence Window: 1956 to 1976");
  });

  it("uses the typed first name in the privacy note and the preview", async () => {
    await mount();

    type("First name", "Margaret");
    type(/Year they were born/, "1946");

    expect(screen.getByText(/Stays on this device/).textContent).toContain("We never send Margaret to anyone.");
    expect(document.body.textContent).toContain("Margaret was about 10 to 30 years old from 1956 to 1976");
  });

  it("moves focus to the error summary when validation fails, and names every problem", async () => {
    await mount();

    next();

    const summary = screen.getByRole("region", { name: "2 things to check" });
    expect(document.activeElement).toBe(summary);
    expect(within(summary).getByText(/Enter their first name/)).toBeTruthy();
    expect(within(summary).getByText(/Enter the year they were born/)).toBeTruthy();
    expect(screen.getByLabelText("First name").getAttribute("aria-invalid")).toBe("true");
    expect(heading()).toBe("Tell us about them");
  });

  it("links each summary entry to its field", async () => {
    await mount();
    next();

    fireEvent.click(screen.getByRole("link", { name: /First name: Enter their first name/ }));

    expect(document.activeElement).toBe(screen.getByLabelText("First name"));
  });

  it("describes a field's error to assistive tech and clears it as the Caregiver fixes it", async () => {
    await mount();
    next();
    const input = screen.getByLabelText("First name");
    const errorId = input.getAttribute("aria-describedby")?.split(" ").find((id) => document.getElementById(id)?.textContent?.includes("Error"));
    expect(errorId).toBeTruthy();

    type("First name", "Margaret");

    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByText(/Enter their first name/)).toBeNull();
  });

  it("nudges about a surname without blocking the step", async () => {
    await mount();

    type("First name", "Margaret Smith");
    type(/Year they were born/, "1946");

    expect(screen.getByText(/looks like a full name/)).toBeTruthy();
    expect(screen.getByLabelText("First name").getAttribute("aria-describedby")).toContain("pii");
    next();
    expect(await screen.findByRole("heading", { level: 1, name: "The places that shaped them" })).toBeTruthy();
  });

  it("leaves for the landing page from Back, saving what is valid", async () => {
    const { repo } = await mount();
    type("First name", "Margaret");

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => expect(leave).toHaveBeenCalledTimes(1));
    expect(repo.getState().draft?.values).toEqual(expect.objectContaining({ firstName: "Margaret" }));
  });
});

describe("saving and resuming (A16)", () => {
  it("saves the draft after every step", async () => {
    const { repo } = await mount();

    await fillStepOne();

    expect(repo.getState().draft).toMatchObject({
      step: 2,
      values: { firstName: "Margaret", birthYear: 1946 },
    });
  });

  it("restores step 3 and its values after a reload", async () => {
    const storage = memoryStorage();
    const first = await mount(storage);
    await fillStepOne();
    type(/Where they grew up/, "Memphis");
    type(/Where they live now/, "Nashville");
    next();
    await screen.findByRole("heading", { level: 1, name: "Where their family comes from" });
    type(/^Heritage/, "Irish");
    next();
    await screen.findByRole("heading", { level: 1, name: "A few favorites to start from" });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await screen.findByRole("heading", { level: 1, name: "Where their family comes from" });
    expect(first.repo.getState().draft?.step).toBe(3);
    cleanup();

    startUrlStep = 3; // what the address bar still says after a reload
    await mount(storage);

    expect(screen.getByText("Step 3 of 6")).toBeTruthy();
    expect((screen.getByLabelText(/^Heritage/) as HTMLInputElement).value).toBe("Irish");
    expect(screen.getByText(/Welcome back/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await screen.findByRole("heading", { level: 1, name: "The places that shaped them" });
    expect((screen.getByLabelText(/Where they grew up/) as HTMLInputElement).value).toBe("Memphis");
    expect((screen.getByLabelText(/Where they live now/) as HTMLInputElement).value).toBe("Nashville");
  });

  it("resumes at the saved step when the URL has no step", async () => {
    const storage = memoryStorage();
    const draft: LifeStoryDraft = {
      step: 3,
      values: { firstName: "Margaret", birthYear: 1946, hometown: "Memphis" },
      updatedAt: NOW,
    };
    await storage.set(STORE_KEY, {
      schemaVersion: 1, lifeStories: [], draft, profiles: {}, kits: {}, sessionLogs: {}, activeStoryId: null,
    });

    await mount(storage);

    expect(screen.getByText("Step 3 of 6")).toBeTruthy();
  });

  it("does not let a link jump past steps that are not done", async () => {
    startUrlStep = 5;

    await mount();

    expect(screen.getByText("Step 1 of 6")).toBeTruthy();
  });

  it("keeps working, and says so, when saving fails", async () => {
    const failing: KeyValueStorage = { ...memoryStorage(), set: () => Promise.reject(new Error("quota")) };
    await mount(failing);

    await fillStepOne();

    expect(screen.getByText(/could not save your last change/)).toBeTruthy();
  });

  it("says when the browser cannot keep a draft between visits", async () => {
    const broken: KeyValueStorage = {
      kind: "indexeddb",
      get: () => Promise.reject(new Error("blocked")),
      set: () => Promise.reject(new Error("blocked")),
      del: () => Promise.reject(new Error("blocked")),
    };

    await mount(broken);

    expect(screen.getByText(/cannot keep a draft between visits/)).toBeTruthy();
  });
});

describe("step 2: Places", () => {
  it("uses the UX labels, needs a Hometown, and has no Skip", async () => {
    await mount();
    await fillStepOne();

    expect(screen.getByLabelText("Where they grew up")).toBeTruthy();
    expect(screen.getByLabelText(/Where they lived as a young adult/)).toBeTruthy();
    expect(screen.getByLabelText(/Where they live now \(for outings\)/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Skip" })).toBeNull();
    next();
    expect(screen.getByRole("region", { name: "One thing to check" })).toBeTruthy();
    expect(screen.getByText(/Enter where they grew up/, { selector: "a *, a" })).toBeTruthy();
  });

  it("warns, gently, about something that looks like an address", async () => {
    await mount();
    await fillStepOne();

    type(/Where they live now/, "12 Oak Street");

    expect(screen.getByText(/looks like an address/)).toBeTruthy();
  });
});

describe("step 3: Roots and the optional steps", () => {
  async function toStepThree() {
    await mount();
    await fillStepOne();
    type(/Where they grew up/, "Memphis");
    next();
    await screen.findByRole("heading", { level: 1, name: "Where their family comes from" });
  }

  it("offers Skip and Back, and every field is optional", async () => {
    await toStepThree();

    expect(screen.getByRole("button", { name: "Skip" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(screen.getAllByText("optional")).toHaveLength(3);
    expect(screen.getByText(/replace their name with a placeholder/)).toBeTruthy();
  });

  it("skips without validating and saves the step as empty", async () => {
    await toStepThree();

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(await screen.findByText("Step 4 of 6")).toBeTruthy();
  });

  it("moves focus to the new step's heading when the step changes", async () => {
    await toStepThree();

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 })));
  });

  it("reaches the Seeds step, where there is no Skip and Next asks for favorites", async () => {
    await toStepThree();
    next();
    await screen.findByText("Step 4 of 6");
    expect(screen.queryByRole("button", { name: "Skip" })).toBeNull();

    next();

    const summary = screen.getByRole("region", { name: "One thing to check" });
    expect(within(summary).getByText(/Choose at least 2 favorites to continue/)).toBeTruthy();
    expect(document.activeElement).toBe(summary);
  });
});

describe("the stepper", () => {
  it("names the step, marks the current one, and does not rely on colour", async () => {
    await mount();
    await fillStepOne();

    const nav = screen.getByRole("navigation", { name: "Life Story progress" });
    const current = within(nav).getByRole("listitem", { current: "step" });

    expect(current.textContent).toContain("Places");
    expect(nav.textContent).toContain("About them (done)");
    expect(nav.textContent).toContain("Step 2 of 6");
  });
});

describe("waiting for the store", () => {
  it("shows a quiet waiting state with one h1 until the draft has loaded", () => {
    const repo = createRepository(memoryStorage(), MIGRATIONS);
    act(() => {
      render(
        <StoreProvider repository={repo}>
          <IntakeWizard />
        </StoreProvider>,
      );
    });

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
