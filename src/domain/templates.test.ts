import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/agent/templates";
import { Domain, Stage } from "@/contracts/primitives";
import { checkText, type TextCheckContext } from "@/domain/checkText";
import { SESSION_FORMATS, wordCount } from "@/domain/sessionFormats";

const DOMAINS = Domain.options;
const STAGES = Stage.options;

/** Nothing is known: a template may not lean on any name at all. */
const BARE_CONTEXT: TextCheckContext = {
  registryNames: [],
  seedNames: [],
  learnedFavoriteNames: [],
  fingerprintTagNames: [],
  places: [],
  avoidTopics: [],
  sensitiveThemesOptIn: false,
};

/** Kit contract limits (src/contracts/kit.ts). */
const LIMITS = { title: 60, theme: 120, prompt: 140, sensory: 200, tip: 160, whyThis: 160 };

/** R12: never presume a living spouse, parent, child or sibling ("your family" as a whole is fine). */
const PRESUMED_RELATIVE =
  /\b(?:your|his|her|their) (?:husband|wife|spouse|partner|mother|mom|mum|mama|father|dad|papa|parents?|son|daughter|children|kids|brother|sister)\b/i;

interface Labelled {
  readonly where: string;
  readonly text: string;
}

const promptEntries: Labelled[] = DOMAINS.flatMap((domain) =>
  STAGES.flatMap((stage) =>
    TEMPLATES.prompts[domain][stage].map((text) => ({ where: `prompt ${domain}/${stage}`, text })),
  ),
);
const sensoryEntries: Labelled[] = STAGES.flatMap((stage) =>
  TEMPLATES.sensoryActivities[stage].map((text) => ({ where: `sensory ${stage}`, text })),
);
const tipEntries: Labelled[] = STAGES.flatMap((stage) =>
  TEMPLATES.caregiverTips[stage].map((text) => ({ where: `tip ${stage}`, text })),
);
const whyEntries: Labelled[] = DOMAINS.map((domain) => ({
  where: `whyThis ${domain}`,
  text: TEMPLATES.whyThis[domain],
}));
const headingEntries: Labelled[] = TEMPLATES.titleThemes.flatMap((entry) => [
  { where: "title", text: entry.title },
  { where: "theme", text: entry.theme },
]);
const bodyEntries = [...promptEntries, ...sensoryEntries, ...tipEntries, ...whyEntries];

describe("templates: minimums (PLAN section 10 slice 3a-i, R12)", () => {
  it.each(DOMAINS.flatMap((domain) => STAGES.map((stage) => [domain, stage] as const)))(
    "has at least 3 Prompts for %s x %s",
    (domain, stage) => {
      expect(TEMPLATES.prompts[domain][stage].length).toBeGreaterThanOrEqual(3);
    },
  );

  it.each(STAGES)("has at least 6 sensory activities for %s", (stage) => {
    expect(TEMPLATES.sensoryActivities[stage].length).toBeGreaterThanOrEqual(6);
  });

  it("has at least 8 Session titles and themes", () => {
    expect(TEMPLATES.titleThemes.length).toBeGreaterThanOrEqual(8);
  });

  it.each(STAGES)("has Caregiver tips for %s", (stage) => {
    expect(TEMPLATES.caregiverTips[stage].length).toBeGreaterThanOrEqual(3);
  });

  it("has a whyThis line for every Domain", () => {
    expect(Object.keys(TEMPLATES.whyThis).sort()).toEqual([...DOMAINS].sort());
  });
});

describe("templates: every template passes checkText in its scope (SC-7)", () => {
  it.each(bodyEntries.map((entry) => [`${entry.where}: ${entry.text}`, entry.text] as const))(
    "body %s",
    (_label, text) => {
      expect(checkText(text, "body", BARE_CONTEXT)).toEqual([]);
    },
  );

  it.each(headingEntries.map((entry) => [`${entry.where}: ${entry.text}`, entry.text] as const))(
    "heading %s",
    (_label, text) => {
      expect(checkText(text, "heading", BARE_CONTEXT)).toEqual([]);
    },
  );

  it("passes even with the sensitive lexicon on and Avoid topics set to the usual suspects", () => {
    const strict: TextCheckContext = {
      ...BARE_CONTEXT,
      avoidTopics: ["Tennessee Waltz", "hospitals", "Vietnam War", "9/11"],
    };
    for (const entry of bodyEntries) expect(checkText(entry.text, "body", strict)).toEqual([]);
    for (const entry of headingEntries) expect(checkText(entry.text, "heading", strict)).toEqual([]);
  });
});

describe("templates: they fit the stage and the Kit contract", () => {
  it.each(promptEntries.map((entry) => [`${entry.where}: ${entry.text}`, entry] as const))(
    "%s is short enough",
    (_label, entry) => {
      const stage = entry.where.split("/")[1] as Stage;
      expect(wordCount(entry.text)).toBeLessThanOrEqual(SESSION_FORMATS[stage].maxWordsPerPrompt);
      expect(entry.text.length).toBeLessThanOrEqual(LIMITS.prompt);
    },
  );

  it("keeps every string inside its contract length", () => {
    for (const entry of sensoryEntries) expect(entry.text.length).toBeLessThanOrEqual(LIMITS.sensory);
    for (const entry of tipEntries) expect(entry.text.length).toBeLessThanOrEqual(LIMITS.tip);
    for (const entry of whyEntries) expect(entry.text.length).toBeLessThanOrEqual(LIMITS.whyThis);
    for (const entry of TEMPLATES.titleThemes) {
      expect(entry.title.length).toBeLessThanOrEqual(LIMITS.title);
      expect(entry.theme.length).toBeLessThanOrEqual(LIMITS.theme);
    }
  });
});

describe("templates: copy rules (UX section 8, R12)", () => {
  const all = [...bodyEntries, ...headingEntries];

  it("never presumes a living spouse, parent or other relative", () => {
    for (const entry of all) expect(entry.text, entry.where).not.toMatch(PRESUMED_RELATIVE);
  });

  it("never uses an exclamation mark or a placeholder other than {name}", () => {
    for (const entry of all) {
      expect(entry.text, entry.where).not.toContain("!");
      expect(entry.text, entry.where).not.toMatch(/\{(?!name\})/);
    }
  });

  it("never says patient, user or resident (CONTEXT.md)", () => {
    for (const entry of all) expect(entry.text, entry.where).not.toMatch(/\b(?:patients?|users?|residents?)\b/i);
  });

  it("has no duplicate within a list", () => {
    for (const domain of DOMAINS)
      for (const stage of STAGES) {
        const list = TEMPLATES.prompts[domain][stage];
        expect(new Set(list).size).toBe(list.length);
      }
    for (const stage of STAGES) {
      expect(new Set(TEMPLATES.sensoryActivities[stage]).size).toBe(TEMPLATES.sensoryActivities[stage].length);
      expect(new Set(TEMPLATES.caregiverTips[stage]).size).toBe(TEMPLATES.caregiverTips[stage].length);
    }
    const titles = TEMPLATES.titleThemes.map((entry) => entry.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("is frozen, so no caller can change a vetted string", () => {
    expect(Object.isFrozen(TEMPLATES)).toBe(true);
    expect(Object.isFrozen(TEMPLATES.prompts.music.early)).toBe(true);
  });
});
