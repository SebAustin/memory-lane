// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Cue } from "@/contracts";
import { MARGARET } from "@/demo/margaret";
import { Landing } from "@/features/landing/Landing";

afterEach(cleanup);

const sampleCue = (entityId: string, name: string): Cue => ({
  entityId,
  domain: "music",
  name,
  imageUrl: null,
  tags: [],
  outsideWindow: false,
  whyThis: "Often loved by people who share {name}'s era.",
  prompts: ["Tell me about it."],
  provenance: {
    affinity: 0.9,
    seeds: [],
    signals: { ageBucket: "55_and_older" },
    signalsOnly: true,
    cached: false,
    synthetic: true,
    recordedExample: false,
    envelope: "ok",
  },
});

const SAMPLES = [
  sampleCue("fx-artist-a", "Loretta Lynn"),
  sampleCue("fx-artist-b", "Brenda Lee"),
  sampleCue("fx-artist-c", "Skeeter Davis"),
];

describe("Landing", () => {
  it("offers Meet Margaret and Start a Life Story as plain links (FR-1)", () => {
    render(<Landing seeds={MARGARET.seeds} sampleCues={SAMPLES} />);

    expect(screen.getByRole("link", { name: "Meet Margaret" }).getAttribute("href")).toBe("/p/demo-margaret/kit");
    expect(screen.getByRole("link", { name: "Start a Life Story" }).getAttribute("href")).toBe("/intake");
  });

  it("shows only real Qloo Cues, each carrying its entity id, in the 'With Qloo' sample (ADR 0003)", () => {
    const { container } = render(<Landing seeds={MARGARET.seeds} sampleCues={SAMPLES} />);

    const picks = [...container.querySelectorAll('[data-kind="qloo"] [data-entity-id]')];
    expect(picks.map((el) => [el.getAttribute("data-entity-id"), el.textContent])).toEqual([
      ["fx-artist-a", "Loretta Lynn"],
      ["fx-artist-b", "Brenda Lee"],
      ["fx-artist-c", "Skeeter Davis"],
    ]);
  });

  it("keeps the Baseline copy illustrative: no entity ids on it", () => {
    const { container } = render(<Landing seeds={MARGARET.seeds} sampleCues={SAMPLES} />);

    const baseline = container.querySelector('[data-kind="baseline"]');
    expect(baseline?.querySelector("[data-entity-id]")).toBeNull();
    expect(baseline?.textContent).toContain("Top hits of the 1950s");
  });

  it("draws the hero prints from Margaret's own Seeds, not invented samples", () => {
    const { container } = render(<Landing seeds={MARGARET.seeds} sampleCues={SAMPLES} />);

    const prints = [...container.querySelectorAll("[data-seed-id]")];
    expect(prints.map((el) => el.getAttribute("data-seed-id"))).toEqual(
      MARGARET.seeds.map((seed) => seed.entityId),
    );
    expect(container.textContent).not.toContain("Beale Street");
    expect(container.textContent).toContain("Move Over, Darling");
  });

  it("shows the year of a film Seed on its print", () => {
    const { container } = render(<Landing seeds={MARGARET.seeds} sampleCues={SAMPLES} />);

    const pillowTalk = container.querySelector('[data-seed-id="fx-film-pillow-talk"]') as HTMLElement;
    expect(within(pillowTalk).getByText("1959")).toBeTruthy();
  });

  it("leaves the comparison out, rather than inventing names, when there are no sample Cues", () => {
    const { container } = render(<Landing seeds={MARGARET.seeds} sampleCues={[]} />);

    expect(container.querySelector('[data-kind="qloo"]')).toBeNull();
    expect(container.querySelector('[data-kind="baseline"]')).toBeNull();
    expect(screen.getByRole("link", { name: "Meet Margaret" })).toBeTruthy();
  });

  it("renders fewer prints when the Life Story has fewer Seeds", () => {
    const { container } = render(<Landing seeds={MARGARET.seeds.slice(0, 2)} sampleCues={[]} />);
    expect(container.querySelectorAll("[data-seed-id]")).toHaveLength(2);
  });
});
