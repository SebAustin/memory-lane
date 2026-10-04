// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RootError from "@/app/error";
import NotFound from "@/app/not-found";
import { StoryOnAnotherDevice } from "@/features/kit/StoryOnAnotherDevice";

afterEach(cleanup);

const ADVICE = "Suggestions only, not medical advice.";

describe.each([
  ["the error boundary", () => <RootError error={new Error("boom")} reset={() => undefined} />],
  ["the not-found page", () => <NotFound />],
  ["the other-device page", () => <StoryOnAnotherDevice />],
])("%s", (_name, ui) => {
  it("is a branded page: one h1, landmarks, and the not-medical-advice footer (FR-28)", () => {
    render(ui());

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByRole("contentinfo").textContent).toContain(ADVICE);
    expect(screen.getByRole("link", { name: "Memory Lane" })).toBeTruthy();
  });
});

describe("error and not-found copy", () => {
  it("reassures that the Life Story is safe on this device", () => {
    for (const ui of [<RootError key="e" error={new Error("x")} reset={() => undefined} />, <NotFound key="n" />]) {
      const { unmount } = render(ui);
      expect(document.body.textContent).toContain("Your Life Story is safe on this device.");
      unmount();
    }
  });

  it("offers Try again on the error boundary and wires it to reset", () => {
    const reset = vi.fn();
    render(<RootError error={new Error("x")} reset={reset} />);

    screen.getByRole("button", { name: "Try again" }).click();

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("leaves the error message out of the page", () => {
    render(<RootError error={new Error("secret stack detail")} reset={() => undefined} />);
    expect(document.body.textContent).not.toContain("secret stack detail");
  });

  it("gives the not-found page a way back", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: "Back to the start" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Meet Margaret" }).getAttribute("href")).toBe("/p/demo-margaret/kit");
  });
});
