import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildFixtures, parseItems, PERSONAS, slug } from "./build";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("the committed fixtures are what the persona specs generate", () => {
  const built = buildFixtures();

  it.each(Object.keys(built.fixtures))("fixtures/qloo/%s is up to date (run `pnpm fixtures:build`)", (file) => {
    const onDisk = readFileSync(join(root, "fixtures", "qloo", file), "utf8");
    expect(onDisk).toBe(built.fixtures[file]);
  });

  it("src/qloo/fixtures.ts is up to date (run `pnpm fixtures:build`)", () => {
    expect(readFileSync(join(root, "src", "qloo", "fixtures.ts"), "utf8")).toBe(built.fixturesModule);
  });

  it("covers the five demo Persons: ten files each", () => {
    expect(PERSONAS.map((persona) => persona.id)).toEqual(["p1", "p2", "p3", "p4", "p5"]);
    for (const persona of PERSONAS) {
      const files = Object.keys(built.fixtures).filter((file) => file.startsWith(`fx-${persona.id}-`));
      expect(files).toHaveLength(10);
    }
  });
});

describe("parseItems", () => {
  it("reads name, year and tags, ignoring blank lines", () => {
    expect(parseItems("\n Pillow Talk | 1959 | Romantic comedy, Glamour \n\n", true, "t")).toEqual([
      { name: "Pillow Talk", year: 1959, tags: ["Romantic comedy", "Glamour"] },
    ]);
  });

  it("reads yearless lines", () => {
    expect(parseItems("Graceland | Southern heritage", false, "t")).toEqual([
      { name: "Graceland", tags: ["Southern heritage"] },
    ]);
  });

  it.each([
    ["a missing part", "Pillow Talk | 1959", true],
    ["a bad year", "Pillow Talk | soon | Glamour", true],
    ["an extra part", "Graceland | A | B", false],
    ["an empty tag list", "Graceland | ", false],
  ])("throws on %s", (_label, text, withYear) => {
    expect(() => parseItems(text, withYear, "t")).toThrow(/t:/);
  });
});

describe("slug", () => {
  it("makes stable ascii ids", () => {
    expect(slug("Eat Bulaga!")).toBe("eat-bulaga");
    expect(slug("Run-DMC")).toBe("run-dmc");
    expect(slug("Rocío Dúrcal")).toBe("rocio-durcal");
    expect(slug("Booker T. & the M.G.'s")).toBe("booker-t-and-the-m-g-s");
  });
});
