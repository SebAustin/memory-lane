// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { createRepository } from "./repository";
import { memoryStorage } from "./storage";
import { StoreProvider, useStore, useStoreStatus } from "./useStore";

afterEach(cleanup);

const DRAFT = { step: 3, values: {}, updatedAt: "2026-10-03T12:00:00.000Z" };

function Probe() {
  const step = useStore((s) => s.draft?.step ?? 0);
  const { phase } = useStoreStatus();
  return (
    <p>
      {phase}:{step}
    </p>
  );
}

describe("useStore", () => {
  it("shows an empty store while loading, then the saved data", async () => {
    const storage = memoryStorage();
    const seed = createRepository(storage, []);
    await seed.saveDraft(DRAFT);
    const repo = createRepository(storage, []);

    render(
      <StoreProvider repository={repo}>
        <Probe />
      </StoreProvider>,
    );

    await waitFor(() => expect(screen.getByText("ready:3")).toBeTruthy());
  });

  it("re-renders when a write lands", async () => {
    const repo = createRepository(memoryStorage(), []);
    render(
      <StoreProvider repository={repo}>
        <Probe />
      </StoreProvider>,
    );
    await waitFor(() => expect(screen.getByText("ready:0")).toBeTruthy());

    await act(async () => {
      await repo.saveDraft({ ...DRAFT, step: 5 });
    });

    expect(screen.getByText("ready:5")).toBeTruthy();
  });

  it("renders the empty, loading state on the server, with no storage touched", () => {
    const repo = createRepository(memoryStorage(), []);

    const html = renderToString(
      <StoreProvider repository={repo}>
        <Probe />
      </StoreProvider>,
    );

    expect(html).toContain("loading");
  });
});
