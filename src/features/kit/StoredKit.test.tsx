// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getServerConfig } from "@/config/server-config";
import { KitRequest, LifeStory } from "@/contracts";
import { MARGARET } from "@/demo/margaret";
import { MIGRATIONS } from "@/lib/store/migrations";
import { createRepository } from "@/lib/store/repository";
import { memoryStorage } from "@/lib/store/storage";
import { StoreProvider } from "@/lib/store/useStore";
import { createQlooClient } from "@/qloo";
import { buildInterimKit } from "@/server/kit/buildInterimKit";
import { StoredKit } from "./StoredKit";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const STORY = LifeStory.parse({
  ...MARGARET,
  id: "3f1c2a9e-5b7d-4c1e-9a52-0d8f6e4b7a11",
  occupation: "Margaret's family bakery",
});

/** A real interim Kit for the story, built by the server core against the fixtures. */
async function realKit(body: unknown) {
  const request = KitRequest.parse(body);
  return buildInterimKit(request, { client: createQlooClient(getServerConfig({ QLOO_MODE: "fixture" })), log: () => undefined });
}

function stubFetch(answer: (body: unknown) => Promise<Response>) {
  const spy = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => answer(JSON.parse(String(init?.body))));
  vi.stubGlobal("fetch", spy);
  return spy;
}

async function mount(storyId: string, withStory = true) {
  const repo = createRepository(memoryStorage(), MIGRATIONS);
  await repo.load();
  if (withStory) await repo.saveLifeStory(STORY);
  render(
    <StoreProvider repository={repo}>
      <StoredKit storyId={storyId} />
    </StoreProvider>,
  );
  return repo;
}

describe("the Kit for a Life Story kept in this browser", () => {
  it("asks /api/kit with the digest and profile, never the first name, and shows the Cues", async () => {
    const spy = stubFetch(async (body) => Response.json(await realKit(body)));

    await mount(STORY.id);

    const cards = await screen.findAllByRole("article");
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) expect(card.getAttribute("data-entity-id")).toMatch(/^fx-/);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Margaret");

    const [url, init] = spy.mock.calls[0]!;
    expect(url).toBe("/api/kit");
    const sent = JSON.parse(String(init?.body)) as { digest: Record<string, unknown> };
    expect(sent.digest.occupation).toBe("{name}'s family bakery");
    expect(JSON.stringify(sent)).not.toContain("Margaret");
  });

  it("says the story lives on another device when this browser does not hold it", async () => {
    const spy = stubFetch(async () => Response.json({}));

    await mount("3f1c2a9e-5b7d-4c1e-9a52-0d8f6e4b7a99", false);

    expect(await screen.findByRole("heading", { level: 1, name: /lives on another device/ })).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it("says nothing was lost and offers Try again when the Kit cannot be built", async () => {
    let calls = 0;
    stubFetch(async (body) => {
      calls += 1;
      return calls === 1 ? Response.json({ error: "internal_error" }, { status: 500 }) : Response.json(await realKit(body));
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await mount(STORY.id);

    expect(await screen.findByRole("heading", { level: 1, name: "We couldn't build the Kit this time" })).toBeTruthy();
    expect(screen.getByText(/Nothing was lost/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Meet Margaret" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(screen.getAllByRole("article").length).toBeGreaterThan(0));
    expect(calls).toBe(2);
  });

  it("treats a body that is not the contract as a failure, not as an empty Kit", async () => {
    stubFetch(async () => Response.json({ hello: "world" }));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await mount(STORY.id);

    expect(await screen.findByRole("button", { name: "Try again" })).toBeTruthy();
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("uses the saved Taste Profile when there is one", async () => {
    const spy = stubFetch(async (body) => Response.json(await realKit(body)));
    const repo = createRepository(memoryStorage(), MIGRATIONS);
    await repo.load();
    await repo.saveLifeStory(STORY);
    await repo.setProfile(STORY.id, {
      version: 3,
      seeds: [{ entityId: "fx-artist-patsy-cline", name: "Patsy Cline" }, { entityId: "fx-film-pillow-talk", name: "Pillow Talk" }],
      learnedFavorites: [],
      exclusions: [],
      avoidTopics: [],
    });

    render(
      <StoreProvider repository={repo}>
        <StoredKit storyId={STORY.id} />
      </StoreProvider>,
    );

    await screen.findAllByRole("article");
    expect(JSON.parse(String(spy.mock.calls[0]?.[1]?.body)).profile.version).toBe(3);
  });
});
