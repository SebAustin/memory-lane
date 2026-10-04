// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Cue } from "@/contracts";
import { CueCard, type CueCardProps } from "@/features/kit/CueCard";

afterEach(cleanup);

const cue = (overrides: Partial<Cue> = {}): Cue => ({
  entityId: "fx-artist-loretta-lynn",
  domain: "music",
  name: "Loretta Lynn",
  imageUrl: null,
  tags: [
    { id: "t1", name: "Country" },
    { id: "t2", name: "Honky-tonk" },
    { id: "t3", name: "Nashville sound" },
  ],
  outsideWindow: false,
  whyThis: "Often loved by people who share {name}'s era, hometown and favorites.",
  prompts: ["Tell me about the music you loved."],
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
  ...overrides,
});

function renderCue(c: Cue, props: Partial<CueCardProps> = {}) {
  return render(<CueCard cue={c} personName="Margaret" index={0} {...props} />);
}

describe("CueCard", () => {
  it("is an article carrying the Qloo entity id (SC-1)", () => {
    renderCue(cue());

    const article = screen.getByRole("article");
    expect(article.getAttribute("data-entity-id")).toBe("fx-artist-loretta-lynn");
  });

  it("is named by its heading", () => {
    renderCue(cue());

    expect(screen.getByRole("article", { name: "Loretta Lynn" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Loretta Lynn" })).toBeTruthy();
  });

  it("fills the {name} placeholder at render time", () => {
    renderCue(cue());

    expect(
      screen.getByText("Often loved by people who share Margaret's era, hometown and favorites."),
    ).toBeTruthy();
    expect(document.body.textContent).not.toContain("{name}");
  });

  it("shows the monogram fallback, with explicit dimensions, when there is no image", () => {
    const { container } = renderCue(cue({ imageUrl: null }));

    const picture = container.querySelector("[data-cue-image]");
    expect(picture?.tagName.toLowerCase()).toBe("svg");
    expect(picture?.getAttribute("data-cue-image")).toBe("monogram");
    expect(picture?.getAttribute("width")).toBe("320");
    expect(picture?.getAttribute("height")).toBe("240");
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows the Cue's initials in the monogram", () => {
    const { container } = renderCue(cue());

    expect(container.querySelector("svg[data-cue-image] text")?.textContent).toBe("LL");
  });

  it("renders a real image with explicit width and height, lazy by default (NFR-9)", () => {
    const { container } = renderCue(cue({ imageUrl: "https://images.qloo.example/a.jpg" }));

    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://images.qloo.example/a.jpg");
    expect(img?.getAttribute("width")).toBe("320");
    expect(img?.getAttribute("height")).toBe("240");
    expect(img?.getAttribute("loading")).toBe("lazy");
    expect(img?.getAttribute("data-cue-image")).toBe("photo");
    expect(container.querySelector("svg[data-cue-image]")).toBeNull();
  });

  it("loads the first image eagerly with high priority when asked", () => {
    const { container } = renderCue(cue({ imageUrl: "https://images.qloo.example/a.jpg" }), {
      eager: true,
    });

    const img = container.querySelector("img");
    expect(img?.getAttribute("loading")).toBe("eager");
    expect(img?.getAttribute("fetchpriority")).toBe("high");
  });

  it("labels the domain, and shows the year when there is one", () => {
    renderCue(cue({ domain: "film", year: 1959, name: "Pillow Talk" }));

    const article = screen.getByRole("article", { name: "Pillow Talk" });
    expect(within(article).getByText("Film")).toBeTruthy();
    expect(within(article).getByText("1959")).toBeTruthy();
  });

  it("lists the three tags a Cue can carry, as a labelled list", () => {
    renderCue(cue());

    const tags = within(screen.getByRole("list", { name: "Tags" })).getAllByRole("listitem");
    expect(tags.map((tag) => tag.textContent)).toEqual(["Country", "Honky-tonk", "Nashville sound"]);
  });

  it("omits the tag list when the Cue has no tags", () => {
    renderCue(cue({ tags: [] }));

    expect(screen.queryByRole("list")).toBeNull();
  });

  it("renders a hostile name as text, never as markup", () => {
    const { container } = renderCue(cue({ name: '<img src=x onerror="alert(1)">' }));

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe('<img src=x onerror="alert(1)">');
  });
});
