// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AboutPage from "@/app/about/page";
import { MIGRATIONS } from "@/lib/store/migrations";
import { createRepository } from "@/lib/store/repository";
import { memoryStorage } from "@/lib/store/storage";
import { StoreProvider } from "@/lib/store/useStore";

afterEach(cleanup);

function mount() {
  render(
    <StoreProvider repository={createRepository(memoryStorage(), MIGRATIONS)}>
      <AboutPage />
    </StoreProvider>,
  );
}

describe("/about", () => {
  it("is a branded page with one h1, landmarks and the not-medical-advice footer (FR-28)", () => {
    mount();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("How Memory Lane works");
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByRole("contentinfo").textContent).toContain("Suggestions only, not medical advice.");
  });

  it("explains how it works, the evidence honestly, Qloo, and the limits", () => {
    mount();

    for (const name of ["How it works", "What the research says", "Where Qloo comes in", "Limits"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeTruthy();
    }
    const evidence = screen.getByRole("region", { name: "What the research says" }).textContent ?? "";
    expect(evidence).toContain("may bring small benefits");
    expect(evidence).not.toMatch(/improv|cure|treat(s|ment)|slows decline/i);
    expect(screen.getByRole("region", { name: "Limits" }).textContent).toContain(
      "It is not medical advice or therapy.",
    );
  });

  it("ends with Your data, reachable at #privacy and from the top bar", () => {
    mount();

    expect(screen.getByRole("region", { name: "Your data" }).id).toBe("privacy");
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Your data" }).getAttribute("href")).toBe("/about#privacy");
    expect(within(nav).getByRole("link", { name: "How it works" }).getAttribute("href")).toBe("/about");
  });

  it("never calls the Person a patient", () => {
    mount();
    expect(document.body.textContent).not.toMatch(/patient/i);
  });
});
