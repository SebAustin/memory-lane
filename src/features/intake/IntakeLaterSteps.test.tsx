// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useCallback, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LifeStory, type LifeStoryDraft, type SeedCandidate } from "@/contracts";
import { MIGRATIONS, STORE_KEY } from "@/lib/store/migrations";
import { createRepository } from "@/lib/store/repository";
import { memoryStorage } from "@/lib/store/storage";
import { StoreProvider } from "@/lib/store/useStore";
import { IntakeWizard } from "./IntakeWizard";
import type { EntityOutcome, Resolver, TagOutcome } from "./resolver";
import type { IntakeNav } from "./useIntakeNav";

/**
 * Steps 4-6 through the wizard, with the lookup scripted at the `Resolver`
 * seam (the wire itself is tested in resolver.test.ts). The address bar is a
 * state variable, as in IntakeWizard.test.tsx.
 */
const openKit = vi.fn();
vi.mock("./useIntakeNav", () => ({
  useIntakeNav: (): IntakeNav => {
    const [requested, setRequested] = useState<number | null>(null);
    const go = useCallback((step: number) => setRequested(step), []);
    return { requested, go, leave: vi.fn(), openKit };
  },
}));

const cand = (entityId: string, name: string, extra: Partial<SeedCandidate> = {}): SeedCandidate => ({
  entityId,
  name,
  domain: "music",
  imageUrl: null,
  ...extra,
});

const PATSY = cand("fx-artist-patsy-cline", "Patsy Cline", { description: "American country singer" });
const PILLOW = cand("fx-film-pillow-talk", "Pillow Talk", { domain: "film", year: 1959 });
const SINGER = cand("fx-artist-doris-day", "Doris Day", { description: "American singer and actress" });
const REVUE = cand("fx-artist-doris-day-revue", "Doris Day", { description: "A 1950s pop revue act" });
const SHOW = cand("fx-tv-doris-day-show", "The Doris Day Show", { domain: "tv", year: 1968 });
const APOCALYPSE = cand("fx-film-apocalypse-now", "Apocalypse Now", { domain: "film", year: 1979 });

interface Script {
  entity?: Record<string, EntityOutcome | EntityOutcome[]>;
  tag?: Record<string, TagOutcome>;
}

function scripted({ entity = {}, tag = {} }: Script) {
  const entityCalls = vi.fn();
  const tagCalls = vi.fn();
  const resolver: Resolver = {
    async entity(query, context) {
      entityCalls(query, context);
      const answer = entity[query.trim().toLowerCase()];
      if (Array.isArray(answer)) return answer.shift() ?? { kind: "none" };
      return answer ?? { kind: "none" };
    },
    async tag(query, context) {
      tagCalls(query, context);
      return tag[query.trim().toLowerCase()] ?? { kind: "topic", reachedQloo: true };
    },
  };
  return { resolver, entityCalls, tagCalls };
}

const BASE_VALUES = { firstName: "Margaret", birthYear: 1946, hometown: "Memphis" } as const;

async function mount(resolver: Resolver, values: LifeStoryDraft["values"] = {}, step = 4) {
  const storage = memoryStorage();
  await storage.set(STORE_KEY, {
    schemaVersion: 1,
    lifeStories: [],
    draft: { step, values: { ...BASE_VALUES, ...values }, updatedAt: "2026-10-04T10:00:00.000Z" },
    profiles: {},
    kits: {},
    sessionLogs: {},
    activeStoryId: null,
  });
  const repo = createRepository(storage, MIGRATIONS);
  render(
    <StoreProvider repository={repo}>
      <IntakeWizard resolver={resolver} />
    </StoreProvider>,
  );
  await screen.findByRole("heading", { level: 1, name: /.+/ }, { timeout: 2000 });
  await waitFor(() => expect(screen.queryByText(/Opening your draft/)).toBeNull());
  return repo;
}

const find = () => fireEvent.click(screen.getByRole("button", { name: "Find" }));
const typeInto = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const next = () => fireEvent.click(screen.getByRole("button", { name: "Next" }));

beforeEach(() => openKit.mockClear());
afterEach(cleanup);

describe("step 4: Seeds (FR-4)", () => {
  it("shows one confident match as a print to confirm, and adds it only when confirmed", async () => {
    const { resolver } = scripted({ entity: { "patsy cline": { kind: "match", candidate: PATSY } } });
    const repo = await mount(resolver);

    typeInto(/Add a favorite/, "patsy cline");
    find();

    const confirm = await screen.findByRole("region", { name: "Is this the one?" });
    expect(within(confirm).getByText("Patsy Cline")).toBeTruthy();
    expect(within(confirm).getByText("American country singer")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Chosen favorites" })).toBeNull();
    expect(repo.getState().draft?.values.seeds).toBeUndefined();

    fireEvent.click(within(confirm).getByRole("button", { name: "Yes, add to favorites" }));

    const chosen = await screen.findByRole("list", { name: "Chosen favorites" });
    expect(within(chosen).getByText("Patsy Cline")).toBeTruthy();
    expect(document.body.textContent).toContain("1 of 5 favorites chosen. Choose at least 2.");
    expect((screen.getByLabelText(/Add a favorite/) as HTMLInputElement).value).toBe("");
    await waitFor(() => expect(repo.getState().draft?.values.seeds).toHaveLength(1));
  });

  it("puts focus on the confirm button so a keyboard can go straight on", async () => {
    const { resolver } = scripted({ entity: { "patsy cline": { kind: "match", candidate: PATSY } } });
    await mount(resolver);

    typeInto(/Add a favorite/, "patsy cline");
    find();

    const button = await screen.findByRole("button", { name: "Yes, add to favorites" });
    await waitFor(() => expect(document.activeElement).toBe(button));
  });

  it("asks 'Which Doris Day did you mean?' as a radiogroup, with None of these, and picks nothing (EVALS (a))", async () => {
    const { resolver } = scripted({
      entity: { "doris day": { kind: "choose", candidates: [SINGER, REVUE, SHOW] } },
    });
    const repo = await mount(resolver);

    typeInto(/Add a favorite/, "Doris Day");
    find();

    const group = await screen.findByRole("radiogroup", { name: "Which Doris Day did you mean?" });
    const radios = within(group).getAllByRole("radio") as HTMLInputElement[];
    expect(radios).toHaveLength(4);
    expect(radios.every((radio) => !radio.checked)).toBe(true);
    expect(within(group).getByText("American singer and actress")).toBeTruthy();
    expect(within(group).getByText("A 1950s pop revue act")).toBeTruthy();
    expect(within(group).getByRole("radio", { name: /None of these/ })).toBeTruthy();
    expect((within(group).getByRole("button", { name: "Add to favorites" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("list", { name: "Chosen favorites" })).toBeNull();
    expect(repo.getState().draft?.values.seeds).toBeUndefined();
  });

  it("moves focus into the choices, and a chosen chip still needs an explicit Add", async () => {
    const { resolver } = scripted({ entity: { "doris day": { kind: "choose", candidates: [SINGER, REVUE] } } });
    await mount(resolver);
    typeInto(/Add a favorite/, "Doris Day");
    find();
    const group = await screen.findByRole("radiogroup", { name: /Which Doris Day/ });
    const [first, second] = within(group).getAllByRole("radio") as HTMLInputElement[];
    await waitFor(() => expect(document.activeElement).toBe(first));

    fireEvent.click(second!);

    expect(second!.checked).toBe(true);
    expect(screen.queryByRole("list", { name: "Chosen favorites" })).toBeNull();
    fireEvent.click(within(group).getByRole("button", { name: "Add to favorites" }));
    const chosen = await screen.findByRole("list", { name: "Chosen favorites" });
    expect(within(chosen).getByText("Doris Day")).toBeTruthy();
    expect(within(chosen).getByText("Music")).toBeTruthy();
  });

  it("'None of these' adds nothing and goes back to the box with the text selected", async () => {
    const { resolver } = scripted({ entity: { "doris day": { kind: "choose", candidates: [SINGER, REVUE] } } });
    await mount(resolver);
    typeInto(/Add a favorite/, "Doris Day");
    find();
    const group = await screen.findByRole("radiogroup", { name: /Which Doris Day/ });

    fireEvent.click(within(group).getByRole("radio", { name: /None of these/ }));
    fireEvent.click(within(group).getByRole("button", { name: "Search again" }));

    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByRole("list", { name: "Chosen favorites" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText(/Add a favorite/));
    expect((screen.getByLabelText(/Add a favorite/) as HTMLInputElement).value).toBe("Doris Day");
  });

  it("says what it could not find, and the fixture hint, when there is no result", async () => {
    const { resolver } = scripted({
      entity: { "pattsy klein": { kind: "none", hint: "Fixture mode: try the demo Seeds (P1-P5)" } },
    });
    await mount(resolver);

    typeInto(/Add a favorite/, "Pattsy Klein");
    find();

    expect(await screen.findByText("We couldn't find 'Pattsy Klein'. Check the spelling or try the full name.")).toBeTruthy();
    expect(screen.getByText("Fixture mode: try the demo Seeds (P1-P5)")).toBeTruthy();
  });

  it("says Qloo is out of reach, that answers are saved, and Retry looks again", async () => {
    const { resolver, entityCalls } = scripted({
      entity: { "patsy cline": [{ kind: "unreachable" }, { kind: "match", candidate: PATSY }] },
    });
    await mount(resolver);
    typeInto(/Add a favorite/, "Patsy Cline");
    find();

    expect(await screen.findByText("We can't reach Qloo right now. Your answers are saved.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("region", { name: "Is this the one?" })).toBeTruthy();
    expect(entityCalls).toHaveBeenCalledTimes(2);
  });

  it("tells the Caregiver to wait when Qloo is busy", async () => {
    const { resolver } = scripted({ entity: { "patsy cline": { kind: "busy", retryAfterSec: 42 } } });
    await mount(resolver);
    typeInto(/Add a favorite/, "Patsy Cline");
    find();

    expect(await screen.findByText(/Wait 42 seconds, then try again/)).toBeTruthy();
  });

  it("looks up on Enter, without submitting the step", async () => {
    const { resolver, entityCalls } = scripted({ entity: { "patsy cline": { kind: "match", candidate: PATSY } } });
    await mount(resolver);
    typeInto(/Add a favorite/, "Patsy Cline");

    fireEvent.keyDown(screen.getByLabelText(/Add a favorite/), { key: "Enter" });

    expect(await screen.findByRole("region", { name: "Is this the one?" })).toBeTruthy();
    expect(entityCalls).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Step 4 of 6")).toBeTruthy();
  });

  it("gives the resolver the typed first name to scrub, never the draft's other data", async () => {
    const { resolver, entityCalls } = scripted({ entity: { "margaret's patsy cline": { kind: "none" } } });
    await mount(resolver);

    typeInto(/Add a favorite/, "Margaret's Patsy Cline");
    find();
    await screen.findByText(/We couldn't find/);

    expect(entityCalls).toHaveBeenCalledWith("Margaret's Patsy Cline", { firstName: "Margaret" });
  });

  it("asks for something to look up when the box is blank", async () => {
    const { resolver, entityCalls } = scripted({});
    await mount(resolver);

    find();

    expect(await screen.findByText("Type the name of something they loved.")).toBeTruthy();
    expect(entityCalls).not.toHaveBeenCalled();
  });

  it("never accepts text that is not matched: Next refuses it and says why (FR-4)", async () => {
    const { resolver } = scripted({});
    const repo = await mount(resolver, { seeds: [seed(PATSY), seed(PILLOW)] });

    typeInto(/Add a favorite/, "Doris Day");
    next();

    const summary = screen.getByRole("region", { name: "One thing to check" });
    expect(within(summary).getByText(/“Doris Day” is not matched yet/)).toBeTruthy();
    expect(screen.getByText("Step 4 of 6")).toBeTruthy();
    expect(screen.getByLabelText(/Add a favorite/).getAttribute("aria-invalid")).toBe("true");
    expect(repo.getState().draft?.values.seeds).toHaveLength(2);
  });

  it("lets Next through once there are 2 Seeds and the box is empty", async () => {
    const { resolver } = scripted({});
    await mount(resolver, { seeds: [seed(PATSY), seed(PILLOW)] });

    next();

    expect(await screen.findByText("Step 5 of 6")).toBeTruthy();
  });

  it("removes a Seed, saves that, and refuses a duplicate", async () => {
    const { resolver } = scripted({ entity: { "patsy cline": { kind: "match", candidate: PATSY } } });
    const repo = await mount(resolver, { seeds: [seed(PATSY), seed(PILLOW)] });

    typeInto(/Add a favorite/, "patsy cline");
    find();
    const confirm = await screen.findByRole("region", { name: "Is this the one?" });
    expect(within(confirm).getByText("Already on your list")).toBeTruthy();
    expect(within(confirm).queryByRole("button", { name: /Yes, add/ })).toBeNull();
    fireEvent.click(within(confirm).getByRole("button", { name: "No, search again" }));

    fireEvent.click(screen.getByRole("button", { name: "Remove Pillow Talk" }));

    await waitFor(() => expect(repo.getState().draft?.values.seeds?.map((s) => s.name)).toEqual(["Patsy Cline"]));
  });

  it("stops at 5 Seeds", async () => {
    const { resolver } = scripted({});
    const five = [PATSY, PILLOW, SINGER, REVUE, SHOW].map(seed);
    await mount(resolver, { seeds: five });

    expect((screen.getByLabelText(/Add a favorite/) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText(/most a Kit starts from/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Find" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps Seeds saved across a reload (the draft holds them)", async () => {
    const { resolver } = scripted({});
    await mount(resolver, { seeds: [seed(PATSY)] });

    expect(within(screen.getByRole("list", { name: "Chosen favorites" })).getByText("Patsy Cline")).toBeTruthy();
  });
});

const seed = (candidate: SeedCandidate) => ({
  entityId: candidate.entityId,
  name: candidate.name,
  domain: candidate.domain,
  ...(candidate.year === undefined ? {} : { year: candidate.year }),
  imageUrl: null,
});

describe("step 5: Avoid List (FR-5)", () => {
  const TWO_SEEDS = { seeds: [seed(PATSY), seed(PILLOW)] };

  it("opens as an optional step, with the sensitive-themes switch off by default", async () => {
    const { resolver } = scripted({});
    await mount(resolver, TWO_SEEDS, 5);

    expect(screen.getByRole("button", { name: "Skip" })).toBeTruthy();
    const toggle = screen.getByRole("checkbox", { name: /Include themes like war, loss or hospitals/ }) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    expect(screen.getByText("Some veterans enjoy these. Leave off if unsure.")).toBeTruthy();
  });

  it("saves the switch to the draft when it is turned on", async () => {
    const { resolver } = scripted({});
    const repo = await mount(resolver, TWO_SEEDS, 5);

    fireEvent.click(screen.getByRole("checkbox", { name: /Include themes/ }));

    await waitFor(() => expect(repo.getState().draft?.values.sensitiveThemesOptIn).toBe(true));
  });

  it("resolves an entity like a Seed, and says Qloo will leave it out", async () => {
    const { resolver } = scripted({ entity: { "apocalypse now": { kind: "match", candidate: APOCALYPSE } } });
    const repo = await mount(resolver, TWO_SEEDS, 5);

    typeInto(/Add something by name/, "apocalypse now");
    find();
    fireEvent.click(await screen.findByRole("button", { name: "Yes, add to Avoid List" }));

    const list = await screen.findByRole("list", { name: "Avoid List" });
    expect(within(list).getByText("Apocalypse Now")).toBeTruthy();
    expect(within(list).getByText("Left out of every Kit, by Qloo and by name")).toBeTruthy();
    await waitFor(() =>
      expect(repo.getState().draft?.values.avoidList).toEqual([
        { kind: "entity", entityId: "fx-film-apocalypse-now", name: "Apocalypse Now", domain: "film" },
      ]),
    );
  });

  it("will not put a favorite on the Avoid List", async () => {
    const { resolver } = scripted({ entity: { "patsy cline": { kind: "match", candidate: PATSY } } });
    await mount(resolver, TWO_SEEDS, 5);

    typeInto(/Add something by name/, "patsy cline");
    find();

    const confirm = await screen.findByRole("region", { name: "Is this the one?" });
    expect(within(confirm).getByText("One of your favorites")).toBeTruthy();
  });

  it("matches a topic to a Qloo tag and shows the outcome", async () => {
    const { resolver } = scripted({ tag: { "war films": { kind: "tag", tag: { id: "fx-tag-war-films", name: "War films" } } } });
    const repo = await mount(resolver, TWO_SEEDS, 5);

    typeInto(/Add a topic/, "war films");
    fireEvent.click(screen.getByRole("button", { name: "Add topic" }));

    expect(await screen.findByText("'war films' matched a Qloo tag: War films.")).toBeTruthy();
    const list = screen.getByRole("list", { name: "Avoid List" });
    expect(within(list).getByText("Matched to a Qloo tag: War films")).toBeTruthy();
    await waitFor(() =>
      expect(repo.getState().draft?.values.avoidList).toEqual([{ kind: "tag", tagId: "fx-tag-war-films", name: "War films" }]),
    );
  });

  it("keeps an unmatched topic as guidance for conversation Prompts", async () => {
    const { resolver } = scripted({});
    await mount(resolver, TWO_SEEDS, 5);

    typeInto(/Add a topic/, "Vietnam War");
    fireEvent.keyDown(screen.getByLabelText(/Add a topic/), { key: "Enter" });

    const list = await screen.findByRole("list", { name: "Avoid List" });
    expect(within(list).getByText("Vietnam War")).toBeTruthy();
    expect(within(list).getByText("We'll keep this out of conversation Prompts")).toBeTruthy();
    expect(screen.getByText("Step 5 of 6")).toBeTruthy();
  });

  it("still adds a topic when Qloo cannot be reached, and says so", async () => {
    const { resolver } = scripted({ tag: { hospitals: { kind: "topic", reachedQloo: false } } });
    await mount(resolver, TWO_SEEDS, 5);

    typeInto(/Add a topic/, "hospitals");
    fireEvent.click(screen.getByRole("button", { name: "Add topic" }));

    expect(await screen.findByText(/We couldn't reach Qloo, so 'hospitals' will only be kept out of conversation Prompts/)).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Avoid List" })).getByText("hospitals")).toBeTruthy();
  });

  it("refuses a one-letter topic, and a topic that is already there", async () => {
    const { resolver } = scripted({});
    await mount(resolver, { ...TWO_SEEDS, avoidList: [{ kind: "topic", text: "hospitals" }] }, 5);

    typeInto(/Add a topic/, "x");
    fireEvent.click(screen.getByRole("button", { name: "Add topic" }));
    expect(await screen.findByText("Use 2 to 60 characters.")).toBeTruthy();

    typeInto(/Add a topic/, "Hospitals");
    fireEvent.click(screen.getByRole("button", { name: "Add topic" }));
    expect(await screen.findByText("'Hospitals' is already on the list.")).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Avoid List" })).getAllByRole("listitem")).toHaveLength(1);
  });

  it("removes an item", async () => {
    const { resolver } = scripted({});
    const repo = await mount(resolver, { ...TWO_SEEDS, avoidList: [{ kind: "topic", text: "hospitals" }] }, 5);

    fireEvent.click(screen.getByRole("button", { name: "Remove hospitals" }));

    await waitFor(() => expect(repo.getState().draft?.values.avoidList).toEqual([]));
    expect(screen.getByText(/Nothing yet/)).toBeTruthy();
  });

  it("blocks Next on a topic that was typed but not added, and Skip leaves it behind", async () => {
    const { resolver } = scripted({});
    await mount(resolver, TWO_SEEDS, 5);
    typeInto(/Add a topic/, "hospitals");

    next();

    expect(screen.getByRole("region", { name: "One thing to check" }).textContent).toContain("is not on the list yet");
    expect(screen.getByText("Step 5 of 6")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(await screen.findByText("Step 6 of 6")).toBeTruthy();
  });

  it("stops at 10 items", async () => {
    const { resolver } = scripted({});
    const ten = Array.from({ length: 10 }, (_, i) => ({ kind: "topic" as const, text: `topic ${i}` }));
    await mount(resolver, { ...TWO_SEEDS, avoidList: ten }, 5);

    expect((screen.getByLabelText(/Add a topic/) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/Add something by name/) as HTMLInputElement).disabled).toBe(true);
  });
});

describe("step 6: Stage, review and Build (FR-6)", () => {
  const READY = {
    seeds: [seed(PATSY), seed(PILLOW)],
    avoidList: [{ kind: "topic" as const, text: "Vietnam War" }],
  };

  it("offers Early, Middle and Late as radio cards with none chosen, and the Middle hint", async () => {
    const { resolver } = scripted({});
    await mount(resolver, READY, 6);

    const group = screen.getByRole("radiogroup", { name: /dementia journey/ });
    const radios = within(group).getAllByRole("radio") as HTMLInputElement[];
    expect(radios.map((radio) => radio.labels?.[0]?.textContent)).toEqual([
      expect.stringContaining("Early"),
      expect.stringContaining("Middle"),
      expect.stringContaining("Late"),
    ]);
    expect(radios.every((radio) => !radio.checked)).toBe(true);
    expect(screen.getByText(/Not sure\? Choose Middle\./)).toBeTruthy();
  });

  it("names the Person in the Build button, and asks for a stage first", async () => {
    const { resolver } = scripted({});
    const repo = await mount(resolver, READY, 6);

    fireEvent.click(screen.getByRole("button", { name: /Build Margaret.s Kit/ }));

    const summary = screen.getByRole("region", { name: "One thing to check" });
    expect(within(summary).getByText("Choose a stage. Not sure? Choose Middle.")).toBeTruthy();
    expect(repo.getState().lifeStories).toHaveLength(0);
    expect(openKit).not.toHaveBeenCalled();
  });

  it("summarises every answer with an Edit link back to its step", async () => {
    const { resolver } = scripted({});
    await mount(resolver, { ...READY, heritage: "Irish", occupation: "Seamstress" }, 6);

    const review = screen.getByRole("region", { name: "Review" });
    expect(review.textContent).toContain("Margaret, born 1946");
    expect(review.textContent).toContain("Reminiscence Window: 1956 to 1976");
    expect(review.textContent).toContain("Memphis");
    expect(review.textContent).toContain("Irish · Seamstress");
    expect(review.textContent).toContain("Patsy Cline · Pillow Talk");
    expect(review.textContent).toContain("Vietnam War");
    expect(review.textContent).toContain("Themes like war, loss or hospitals: left out");

    fireEvent.click(within(review).getByRole("button", { name: "Edit About them" }));

    expect(await screen.findByText("Step 1 of 6")).toBeTruthy();
    expect((screen.getByLabelText("First name") as HTMLInputElement).value).toBe("Margaret");
  });

  it("builds the Life Story, saves it with its profile, clears the draft and opens its Kit", async () => {
    const { resolver } = scripted({});
    const repo = await mount(resolver, { ...READY, occupation: "Margaret's family bakery" }, 6);

    fireEvent.click(screen.getByRole("radio", { name: /Middle/ }));
    fireEvent.click(screen.getByRole("button", { name: /Build Margaret.s Kit/ }));

    await waitFor(() => expect(openKit).toHaveBeenCalledTimes(1));
    const state = repo.getState();
    const [story] = state.lifeStories;
    expect(story).toBeDefined();
    expect(LifeStory.safeParse(story).success).toBe(true);
    expect(story).toMatchObject({
      firstName: "Margaret",
      birthYear: 1946,
      hometown: "Memphis",
      dementiaStage: "middle",
      sensitiveThemesOptIn: false,
      seeds: [expect.objectContaining({ name: "Patsy Cline" }), expect.objectContaining({ name: "Pillow Talk" })],
      avoidList: [{ kind: "topic", text: "Vietnam War" }],
    });
    expect(openKit).toHaveBeenCalledWith(story!.id);
    expect(state.activeStoryId).toBe(story!.id);
    expect(state.draft).toBeNull();
    const profile = state.profiles[story!.id];
    expect(profile?.seeds.map((s) => s.name)).toEqual(["Patsy Cline", "Pillow Talk"]);
    expect(JSON.stringify(profile).toLowerCase()).not.toContain("margaret");
  });

  it("builds with an empty Avoid List when that optional step was skipped", async () => {
    const { resolver } = scripted({});
    const repo = await mount(resolver, { seeds: [seed(PATSY), seed(PILLOW)] }, 6);

    fireEvent.click(screen.getByRole("radio", { name: /Early/ }));
    fireEvent.click(screen.getByRole("button", { name: /Build Margaret.s Kit/ }));

    await waitFor(() => expect(openKit).toHaveBeenCalledTimes(1));
    expect(repo.getState().lifeStories[0]).toMatchObject({ avoidList: [], sensitiveThemesOptIn: false, dementiaStage: "early" });
  });

  it("saves the chosen stage in the draft as soon as it is chosen", async () => {
    const { resolver } = scripted({});
    const repo = await mount(resolver, READY, 6);

    fireEvent.click(screen.getByRole("radio", { name: /Late/ }));

    await waitFor(() => expect(repo.getState().draft?.values.dementiaStage).toBe("late"));
  });

  it("says so, and does not open a Kit, when the device already holds 10 Life Stories", async () => {
    const { resolver } = scripted({});
    const repo = await mount(resolver, { ...READY, dementiaStage: "middle" }, 6);
    const story = LifeStory.parse({
      ...BASE_VALUES,
      ...READY,
      dementiaStage: "middle",
      id: "00000000-0000-4000-8000-000000000000",
      createdAt: "2026-10-04T10:00:00.000Z",
    });
    for (let i = 0; i < 10; i += 1) {
      await repo.saveLifeStory({ ...story, id: `00000000-0000-4000-8000-00000000000${i}` });
    }

    fireEvent.click(screen.getByRole("button", { name: /Build Margaret.s Kit/ }));

    expect((await screen.findByRole("alert")).textContent).toContain("10 Life Stories");
    expect(openKit).not.toHaveBeenCalled();
  });
});

describe("a keyboard alone", () => {
  it("can arrow between stage cards, because they are native radios in one group", async () => {
    const { resolver } = scripted({});
    await mount(resolver, { seeds: [seed(PATSY), seed(PILLOW)] }, 6);
    const [early, middle] = screen.getAllByRole("radio") as HTMLInputElement[];

    early!.focus();
    fireEvent.click(middle!);

    expect(middle!.checked).toBe(true);
    expect(early!.name).toBe(middle!.name);
  });
});
