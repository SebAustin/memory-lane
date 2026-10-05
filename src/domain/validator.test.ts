import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/agent/templates";
import { validateKit } from "@/domain/validator";
import { rogueContext } from "@/domain/validator/rogue";
import {
  FOUR_CLEAN,
  idsOf,
  kitOf,
  run,
  session,
} from "@/domain/validator/testkit";
import type { DraftSession } from "@/domain/validator/types";

describe("grounding (ADR 0003)", () => {
  it("leaves a fully grounded, compliant Kit untouched", () => {
    const draft = kitOf(session(["fx-film-breakfast-at-tiffanys", "fx-film-the-sound-of-music", "fx-tv-bonanza", "fx-book-mockingbird"]));
    const result = validateKit(draft, rogueContext(TEMPLATES, "middle"));
    expect(result.drops).toEqual([]);
    expect(result.repairs).toEqual([]);
    expect(result.kit).toEqual(draft);
  });

  it("drops a Cue whose id never came from this run's Qloo registry", () => {
    const first = session(["fx-film-breakfast-at-tiffanys", "fx-film-invented", "fx-film-the-sound-of-music", "fx-tv-bonanza", "fx-book-mockingbird"]);
    const result = run(first);
    expect(result.drops).toContainEqual({
      step: "grounding",
      reason: "not_in_registry",
      sessionIndex: 0,
      entityId: "fx-film-invented",
    });
    expect(idsOf(result)).not.toContain("fx-film-invented");
  });

  it("trusts the registry's domain over the model's, so a film cannot dodge the Window as music", () => {
    const first = session(["fx-film-titanic", "fx-film-the-sound-of-music", "fx-tv-bonanza", "fx-book-mockingbird"]);
    const mislabelled = { ...first, cues: first.cues.map((c) => (c.entity_id === "fx-film-titanic" ? { ...c, domain: "music" as const } : c)) };
    const result = run(mislabelled);
    expect(result.drops).toContainEqual(expect.objectContaining({ entityId: "fx-film-titanic", reason: "outside_window" }));
  });

  it("repairs a wrong domain label on a grounded Cue", () => {
    const first = session(["fx-film-breakfast-at-tiffanys", "fx-film-the-sound-of-music", "fx-tv-bonanza", "fx-book-mockingbird"]);
    const mislabelled = { ...first, cues: first.cues.map((c, i) => (i === 2 ? { ...c, domain: "music" as const } : c)) };
    const result = run(mislabelled);
    expect(result.kit.sessions[0]!.cues[2]!.domain).toBe("tv");
    expect(result.repairs).toContainEqual({
      step: "grounding",
      reason: "domain_corrected",
      sessionIndex: 0,
      field: "cues[2].domain",
    });
  });
});

describe("exclusions and echoes (step 2)", () => {
  const four = FOUR_CLEAN;

  it("drops an excluded entity", () => {
    const result = run(session([...four, "fx-music-elvis-presley"]));
    expect(result.drops).toContainEqual({
      step: "exclusions",
      reason: "excluded_entity",
      sessionIndex: 0,
      entityId: "fx-music-elvis-presley",
    });
    expect(idsOf(result)).not.toContain("fx-music-elvis-presley");
  });

  it("drops an entity that carries an excluded tag", () => {
    const result = run(session([...four, "fx-music-ray-price"]));
    expect(result.drops).toContainEqual({
      step: "exclusions",
      reason: "excluded_tag",
      sessionIndex: 0,
      entityId: "fx-music-ray-price",
    });
  });

  it("drops a Seed echoed back as a Cue (PLAN section 15.4)", () => {
    const result = run(session([...four, "fx-music-patsy-cline"]));
    expect(result.drops).toContainEqual({
      step: "exclusions",
      reason: "seed_or_favorite_echo",
      sessionIndex: 0,
      entityId: "fx-music-patsy-cline",
    });
  });

  it("drops a Learned Favorite echoed back as a Cue", () => {
    const base = rogueContext(TEMPLATES, "middle");
    const profile = {
      ...base.profile,
      learnedFavorites: [
        { entityId: "fx-music-brenda-lee", name: "Brenda Lee", domain: "music" as const, weight: 1, fromSessionId: "s1" },
      ],
    };
    const result = run(session([...four, "fx-music-brenda-lee"]), { profile });
    expect(result.drops).toContainEqual(expect.objectContaining({ entityId: "fx-music-brenda-lee", reason: "seed_or_favorite_echo" }));
  });
});

describe("name screening backstop (step 2b, PLAN section 14.1)", () => {
  const four = FOUR_CLEAN;

  it("drops a Cue whose hydrated name matches an Avoid topic (hospitals vs General Hospital)", () => {
    const result = run(session([...four, "fx-tv-general-hospital"]));
    expect(result.drops).toContainEqual({
      step: "screening",
      reason: "avoid_topic_name",
      sessionIndex: 0,
      entityId: "fx-tv-general-hospital",
    });
  });

  it("drops a Cue whose name hits the sensitive lexicon unless the Caregiver opted in", () => {
    const withWar = session([...four, "fx-book-war-diaries"]);
    expect(run(withWar).drops).toContainEqual(expect.objectContaining({ entityId: "fx-book-war-diaries", reason: "sensitive_name" }));
    const optedIn = run(withWar, { sensitiveThemesOptIn: true });
    expect(optedIn.drops.map((d) => d.entityId)).not.toContain("fx-book-war-diaries");
  });
});

describe("Reminiscence Window (step 3, R2)", () => {
  const inWindow = FOUR_CLEAN;

  it("drops a film outside the effective Window", () => {
    const result = run(session([...inWindow, "fx-film-gone-with-the-wind"]));
    expect(result.drops).toContainEqual({
      step: "window",
      reason: "outside_window",
      sessionIndex: 0,
      entityId: "fx-film-gone-with-the-wind",
    });
  });

  it("drops film, TV and book Cues that have no year", () => {
    const undated = ["fx-film-mystery-reel", "fx-book-undated"];
    const result = run(session([...inWindow, ...undated]));
    for (const entityId of undated) {
      expect(result.drops).toContainEqual(expect.objectContaining({ step: "window", reason: "missing_year", entityId }));
    }
  });

  it("never gates music, places or brands by year", () => {
    const result = run(session([...inWindow, "fx-place-gus", "fx-brand-sears"]));
    expect(result.drops).toEqual([]);
  });

  it("flags nothing for a Cue inside the original Window", () => {
    const result = run(session(inWindow));
    expect(result.kit.sessions[0]!.cues.some((c) => "outsideWindow" in c)).toBe(false);
  });

  it("drops a 1954 film when the Caregiver has not widened", () => {
    const result = run(session([...inWindow, "fx-film-rear-window"]));
    expect(result.drops).toContainEqual(expect.objectContaining({ entityId: "fx-film-rear-window", reason: "outside_window" }));
  });

  it("keeps a Cue inside the widened Window but outside the ORIGINAL one, flagged outsideWindow", () => {
    const result = run(session([...inWindow, "fx-film-rear-window"]), { widened: ["film"] });
    const kept = result.kit.sessions[0]!.cues.find((c) => c.entity_id === "fx-film-rear-window");
    expect(kept?.outsideWindow).toBe(true);
    const inside = result.kit.sessions[0]!.cues.find((c) => c.entity_id === "fx-film-the-sound-of-music");
    expect(inside).not.toHaveProperty("outsideWindow");
  });

  it("widens only the domains the Caregiver widened", () => {
    const result = run(session([...inWindow, "fx-film-rear-window"]), { widened: ["tv"] });
    expect(result.drops).toContainEqual(expect.objectContaining({ entityId: "fx-film-rear-window", reason: "outside_window" }));
  });

  it("still drops a film outside even the widened Window", () => {
    const result = run(session([...inWindow, "fx-film-gone-with-the-wind"]), { widened: ["film"] });
    expect(result.drops).toContainEqual(expect.objectContaining({ entityId: "fx-film-gone-with-the-wind", reason: "outside_window" }));
  });

  it("does not trust an outsideWindow value the model wrote", () => {
    const first = session(inWindow);
    const forged = { ...first, cues: first.cues.map((c) => ({ ...c, outsideWindow: true })) };
    const result = run(forged as DraftSession);
    expect(result.kit.sessions[0]!.cues.some((c) => "outsideWindow" in c)).toBe(false);
  });
});
