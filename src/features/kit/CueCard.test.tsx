import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Cue } from "@/contracts";
import { CueCard } from "@/features/kit/CueCard";

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

const html = (c: Cue, props: Partial<Parameters<typeof CueCard>[0]> = {}) =>
  renderToStaticMarkup(<CueCard cue={c} personName="Margaret" index={0} {...props} />);

describe("CueCard", () => {
  it("renders an article carrying the Qloo entity id (SC-1)", () => {
    expect(html(cue())).toMatch(/<article[^>]*data-entity-id="fx-artist-loretta-lynn"/);
  });

  it("names the Cue in a heading that labels the article", () => {
    const markup = html(cue());
    const labelledBy = /<article[^>]*aria-labelledby="([^"]+)"/.exec(markup)?.[1];

    expect(labelledBy).toBeTruthy();
    expect(markup).toContain(`<h3 id="${labelledBy}"`);
    expect(markup).toMatch(/<h3[^>]*>Loretta Lynn<\/h3>/);
  });

  it("fills the {name} placeholder at render time", () => {
    const markup = html(cue());
    expect(markup).toContain("Often loved by people who share Margaret&#x27;s era, hometown and favorites.");
    expect(markup).not.toContain("{name}");
  });

  it("shows the monogram fallback, with explicit dimensions, when there is no image", () => {
    const markup = html(cue({ imageUrl: null }));

    expect(markup).toMatch(/<svg[^>]*data-cue-image="monogram"/);
    expect(markup).toMatch(/<svg[^>]*width="320"[^>]*height="240"/);
    expect(markup).not.toContain("<img");
  });

  it("shows initials in the monogram", () => {
    expect(html(cue())).toContain(">LL</text>");
  });

  it("renders a real image with explicit width and height, lazy by default (NFR-9)", () => {
    const markup = html(cue({ imageUrl: "https://images.qloo.example/a.jpg" }));

    expect(markup).toMatch(/<img[^>]*data-cue-image="photo"/);
    expect(markup).toMatch(/<img[^>]*src="https:\/\/images\.qloo\.example\/a\.jpg"/);
    expect(markup).toMatch(/<img[^>]*width="320"/);
    expect(markup).toMatch(/<img[^>]*height="240"/);
    expect(markup).toMatch(/<img[^>]*loading="lazy"/);
    expect(markup).not.toContain("<svg data-cue-image");
  });

  it("loads the first image eagerly with high priority when asked", () => {
    const markup = html(cue({ imageUrl: "https://images.qloo.example/a.jpg" }), { eager: true });

    expect(markup).toMatch(/<img[^>]*loading="eager"/);
    expect(markup).toMatch(/<img[^>]*fetchPriority="high"/i);
  });

  it("labels the domain and shows the year when there is one", () => {
    expect(html(cue())).toContain("Music");
    const film = html(cue({ domain: "film", year: 1959, name: "Pillow Talk" }));
    expect(film).toContain("Film");
    expect(film).toContain("1959");
  });

  it("lists at most the tags it is given, as a labelled list", () => {
    const markup = html(cue());
    expect(markup).toContain("Country");
    expect(markup).toContain("Honky-tonk");
    expect(markup).toContain("Nashville sound");
    expect(markup).toMatch(/<ul[^>]*aria-label="Tags"/);
  });

  it("omits the tag list when the Cue has no tags", () => {
    expect(html(cue({ tags: [] }))).not.toContain("<ul");
  });

  it("escapes names instead of injecting markup", () => {
    const markup = html(cue({ name: '<img src=x onerror="alert(1)">' }));
    expect(markup).not.toContain('<img src=x');
    expect(markup).toContain("&lt;img");
  });
});
