// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import StartLifeStoryPage from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("step=2"),
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(cleanup);

describe("the /intake page", () => {
  it("is a branded page: one h1, landmarks, and the not-medical-advice footer (FR-28)", () => {
    render(<StartLifeStoryPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByRole("contentinfo").textContent).toContain("Suggestions only, not medical advice.");
    expect(screen.getByRole("link", { name: "Memory Lane" })).toBeTruthy();
  });

  it("is served with a waiting state that names the page, before the local draft loads", () => {
    const html = renderToString(<StartLifeStoryPage />);

    expect(html).toContain("Start a Life Story");
    expect(html).toContain("Opening your draft");
  });
});
