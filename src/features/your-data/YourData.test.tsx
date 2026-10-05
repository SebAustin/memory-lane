// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_IMPORT_BYTES } from "@/lib/store/importFile";
import { MIGRATIONS, STORE_KEY } from "@/lib/store/migrations";
import { createRepository, type Repository } from "@/lib/store/repository";
import { memoryStorage, storageFrom, type KeyValueStorage } from "@/lib/store/storage";
import { NOW, UUID_A, draft, kit, logEntry, story } from "@/lib/store/testing";
import { StoreProvider } from "@/lib/store/useStore";
import * as download from "./download";
import { StoreBanner } from "./StoreBanner";
import { YourData } from "./YourData";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("./download", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./download")>()),
  downloadText: vi.fn(),
}));

/** jsdom has no modal <dialog>. This is just enough of one: open state and the close event. */
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

const clock = () => NOW;
const downloadText = vi.mocked(download.downloadText);

beforeEach(() => downloadText.mockClear());
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

async function mount(storage: KeyValueStorage = memoryStorage(), ui = <YourData />) {
  const repo = createRepository(storage, MIGRATIONS, { now: clock });
  render(<StoreProvider repository={repo}>{ui}</StoreProvider>);
  await waitFor(() => expect(repo.getStatus().phase).toBe("ready"));
  return repo;
}

async function populate(repo: Repository) {
  await repo.saveLifeStory(story(UUID_A));
  await repo.saveKit(kit(1, UUID_A));
  await repo.appendSessionLog(UUID_A, logEntry(1));
  await repo.saveDraft(draft(2, { firstName: "Doris" }));
}

const fileInput = () => screen.getByLabelText("Memory Lane export file") as HTMLInputElement;
const choose = (file: File) => act(async () => void fireEvent.change(fileInput(), { target: { files: [file] } }));
const jsonFile = (text: string) => new File([text], "memory-lane-export.json", { type: "application/json" });
const dialog = () => screen.getByRole("dialog");

describe("Your data", () => {
  it("is the privacy section, with the UX privacy note and what is on this device", async () => {
    const repo = await mount();
    await populate(repo);

    const section = screen.getByRole("region", { name: "Your data" });
    expect(section.id).toBe("privacy");
    expect(within(section).getByText(/Life Stories stay in this browser\. There are no accounts\./)).toBeTruthy();
    const tallies = within(section).getByText("Life Story").closest("div");
    expect(tallies?.textContent).toContain("1");
  });

  it("uses h2 for the section and h3 for its actions, never a second h1", async () => {
    await mount();

    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
    expect(screen.getByRole("heading", { level: 2, name: "Your data" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "On this device now",
      "Save a copy",
      "Bring a copy back",
      "Delete everything",
    ]);
  });
});

describe("Export", () => {
  it("downloads one versioned JSON file built in the browser", async () => {
    const repo = await mount();
    await populate(repo);

    fireEvent.click(screen.getByRole("button", { name: "Export everything" }));

    expect(downloadText).toHaveBeenCalledTimes(1);
    const [filename, text] = downloadText.mock.calls[0] ?? [];
    expect(filename).toMatch(/^memory-lane-export-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(text ?? "")).toMatchObject({
      app: "memory-lane",
      schemaVersion: 1,
      exportedAt: NOW,
      data: { lifeStories: [{ id: UUID_A }] },
    });
    expect(screen.getByText(`Your file is downloading as ${filename}.`)).toBeTruthy();
  });

  it("builds the filename from the date", () => {
    expect(download.exportFilename("export", "2026-10-04T08:00:00.000Z")).toBe("memory-lane-export-2026-10-04.json");
    expect(download.exportFilename("unreadable", "2026-10-04T08:00:00.000Z")).toBe(
      "memory-lane-unreadable-2026-10-04.json",
    );
  });
});

describe("Import", () => {
  const exportOf = async () => {
    const source = createRepository(memoryStorage(), MIGRATIONS, { now: clock });
    await source.load();
    await populate(source);
    return JSON.stringify(source.exportAll());
  };

  it("shows what the file holds and changes nothing until the Caregiver confirms", async () => {
    const repo = await mount();
    await choose(jsonFile(await exportOf()));

    expect(dialog().textContent).toContain("Replace everything on this device?");
    expect(dialog().textContent).toContain("1 Life Story, 1 Kit and 1 Session Log");
    expect(repo.getState().lifeStories).toHaveLength(0);
  });

  it("replaces the data on Replace everything and says what came in", async () => {
    const repo = await mount();
    await choose(jsonFile(await exportOf()));

    fireEvent.click(within(dialog()).getByRole("button", { name: "Replace everything" }));

    await waitFor(() => expect(screen.getByText(/Imported 1 Life Story, 1 Kit and 1 Session Log/)).toBeTruthy());
    expect(repo.getState().lifeStories).toHaveLength(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("leaves everything as it was on Cancel, and on Esc", async () => {
    const repo = await mount();
    await choose(jsonFile(await exportOf()));
    fireEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    await choose(jsonFile(await exportOf()));
    fireEvent(dialog(), new Event("cancel", { cancelable: true }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(repo.getState().lifeStories).toHaveLength(0);
  });

  it("starts on Cancel, the safe choice, and offers an Export first", async () => {
    await mount();
    await choose(jsonFile(await exportOf()));

    expect(document.activeElement).toBe(within(dialog()).getByRole("button", { name: "Cancel" }));
    expect(within(dialog()).getByRole("button", { name: "Export first" })).toBeTruthy();
  });

  it("turns away a file that is not a Memory Lane export, in words, with no dialog", async () => {
    const repo = await mount();
    await choose(jsonFile("not json"));

    expect(screen.getByRole("alert").textContent).toMatch(/couldn't read that file.*Nothing on this device changed/);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(repo.getState().lifeStories).toHaveLength(0);
  });

  it("turns away a file over 512 KB without reading it", async () => {
    await mount();
    const big = new File(["x"], "big.json", { type: "application/json" });
    Object.defineProperty(big, "size", { value: MAX_IMPORT_BYTES + 1 });
    const read = vi.spyOn(big, "text");

    await choose(big);

    expect(screen.getByRole("alert").textContent).toMatch(/larger than 512 KB/);
    expect(read).not.toHaveBeenCalled();
  });

  it("reports a file the browser cannot read", async () => {
    await mount();
    const broken = jsonFile("{}");
    vi.spyOn(broken, "text").mockRejectedValue(new Error("denied"));

    await choose(broken);

    expect(screen.getByRole("alert").textContent).toMatch(/couldn't open that file/);
  });

  it("mentions an older file will be brought up to date", async () => {
    const v0ToV1 = {
      from: 0,
      up: (raw: unknown) => ({ ...(raw as object), schemaVersion: 1 }),
    };
    const repo = createRepository(memoryStorage(), [v0ToV1], { now: clock });
    render(
      <StoreProvider repository={repo}>
        <YourData />
      </StoreProvider>,
    );
    await waitFor(() => expect(repo.getStatus().phase).toBe("ready"));
    const old = JSON.stringify({
      app: "memory-lane",
      schemaVersion: 0,
      exportedAt: NOW,
      data: { schemaVersion: 0, lifeStories: [], draft: null, profiles: {}, kits: {}, sessionLogs: {}, activeStoryId: null },
    });

    await choose(jsonFile(old));

    expect(dialog().textContent).toContain("older version");
  });

  it("explains a failed save and keeps the old data", async () => {
    const inner = memoryStorage();
    let failing = false;
    const flaky = storageFrom({ ...inner, set: (k, v) => (failing ? Promise.reject(new Error("quota")) : inner.set(k, v)) });
    const repo = await mount(flaky);
    await choose(jsonFile(await exportOf()));
    failing = true;

    fireEvent.click(within(dialog()).getByRole("button", { name: "Replace everything" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/couldn't save the imported data/));
    expect(repo.getState().lifeStories).toHaveLength(0);
  });
});

describe("Delete all", () => {
  it("asks first, with the UX copy and Export, Delete everything and Cancel", async () => {
    await mount();

    fireEvent.click(screen.getByRole("button", { name: "Delete all data" }));

    const d = dialog();
    expect(within(d).getByRole("heading", { name: "Delete all data?" })).toBeTruthy();
    expect(d.textContent).toContain(
      "This removes every Life Story and Session Log from this device. Export first if you want a copy.",
    );
    expect(within(d).getByRole("button", { name: "Export" })).toBeTruthy();
    expect(within(d).getByRole("button", { name: "Delete everything" })).toBeTruthy();
    expect(document.activeElement).toBe(within(d).getByRole("button", { name: "Cancel" }));
  });

  it("deletes nothing until the Caregiver chooses, however long it waits", async () => {
    const repo = await mount();
    await populate(repo);
    fireEvent.click(screen.getByRole("button", { name: "Delete all data" }));
    vi.useFakeTimers();
    try {
      await act(async () => void (await vi.advanceTimersByTimeAsync(60_000)));

      expect(screen.getByRole("dialog")).toBeTruthy();
      expect(repo.getState().lifeStories).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the data on Cancel", async () => {
    const repo = await mount();
    await populate(repo);
    fireEvent.click(screen.getByRole("button", { name: "Delete all data" }));

    fireEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(repo.getState().lifeStories).toHaveLength(1);
  });

  it("can Export from inside the confirmation", async () => {
    const repo = await mount();
    await populate(repo);
    fireEvent.click(screen.getByRole("button", { name: "Delete all data" }));

    fireEvent.click(within(dialog()).getByRole("button", { name: "Export" }));

    expect(downloadText).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("clears the store, the draft and the stored copy on Delete everything", async () => {
    const storage = memoryStorage();
    const repo = await mount(storage);
    await populate(repo);
    fireEvent.click(screen.getByRole("button", { name: "Delete all data" }));

    fireEvent.click(within(dialog()).getByRole("button", { name: "Delete everything" }));

    await waitFor(() => expect(screen.getByText("Everything has been removed from this device.")).toBeTruthy());
    expect(repo.getState().lifeStories).toHaveLength(0);
    expect(repo.getState().draft).toBeNull();
    expect(await storage.get(STORE_KEY)).toBeUndefined();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says so when the browser will not delete", async () => {
    const inner = memoryStorage();
    const stuck = storageFrom({ ...inner, del: () => Promise.reject(new Error("blocked")) });
    const repo = await mount(stuck);
    await populate(repo);
    fireEvent.click(screen.getByRole("button", { name: "Delete all data" }));

    fireEvent.click(within(dialog()).getByRole("button", { name: "Delete everything" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/couldn't delete everything/));
    expect(repo.getState().lifeStories).toHaveLength(1);
  });
});

describe("store banners", () => {
  const withBanner = <StoreBanner />;
  /** In-memory, but claiming to be IndexedDB, so the "no IndexedDB" notice stays out of the way. */
  const disk = (): KeyValueStorage => ({ ...memoryStorage(), kind: "indexeddb" });

  it("shows nothing when the store is healthy", async () => {
    await mount(disk(), withBanner);

    expect(screen.queryByRole("status", { name: "About your saved data" })).toBeNull();
  });

  it("tells the Caregiver when the browser cannot keep anything between visits", async () => {
    await mount(memoryStorage(), withBanner);

    expect(screen.getByText(/cannot keep a draft between visits/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export a copy" })).toBeTruthy();
  });

  it("offers Export for data from a newer version, and the file holds that data", async () => {
    const storage = disk();
    await storage.set(STORE_KEY, { schemaVersion: 2, lifeStories: ["later"] });
    await mount(storage, withBanner);

    expect(screen.getByText(/newer version of Memory Lane/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Export the unreadable data" }));

    const [filename, text] = downloadText.mock.calls[0] ?? [];
    expect(filename).toMatch(/^memory-lane-unreadable-/);
    expect(JSON.parse(text ?? "")).toMatchObject({ data: { schemaVersion: 2 } });
  });

  it("says a copy was set aside when stored data was unreadable", async () => {
    const storage = disk();
    await storage.set(STORE_KEY, "garbage");
    await mount(storage, withBanner);

    expect(screen.getByText(/set aside, not deleted/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export the unreadable data" })).toBeTruthy();
  });

  it("is honest when the copy could not be set aside, and says nothing about one", async () => {
    const inner = disk();
    await inner.set(STORE_KEY, "garbage");
    const storage = storageFrom({
      ...inner,
      set: (k, v) => (k === STORE_KEY ? inner.set(k, v) : Promise.reject(new Error("quota"))),
    });
    await mount(storage, withBanner);

    expect(screen.getByText(/couldn't set a copy aside/)).toBeTruthy();
    expect(screen.queryByText(/set aside, not deleted/)).toBeNull();
    expect(screen.queryByText(/newer version/)).toBeNull();
  });

  it("says when a save failed and offers a copy", async () => {
    const storage = storageFrom({ ...disk(), set: () => Promise.reject(new Error("quota")) });
    const repo = await mount(storage, withBanner);

    await act(async () => void (await repo.saveDraft(draft(1)).catch(() => undefined)));

    expect(screen.getByText(/could not save your last change/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export a copy" })).toBeTruthy();
  });

  it("links to Your data, unless it is already on that page", async () => {
    const failing = () => storageFrom({ ...disk(), set: () => Promise.reject(new Error("quota")) });
    const first = await mount(failing(), <StoreBanner />);
    await act(async () => void (await first.saveDraft(draft(1)).catch(() => undefined)));
    expect(screen.getByRole("link", { name: "Your data" }).getAttribute("href")).toBe("/about#privacy");
    cleanup();

    const second = await mount(failing(), <StoreBanner linkToYourData={false} />);
    await act(async () => void (await second.saveDraft(draft(1)).catch(() => undefined)));
    expect(screen.queryByRole("link", { name: "Your data" })).toBeNull();
  });
});
