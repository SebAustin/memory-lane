/**
 * Generates the hand-made Qloo fixtures (`fixtures/qloo/fx-*.json`,
 * `fixtures/qloo/index.json` and `src/qloo/fixtures.ts`) from the persona
 * specs next to this file. Run `pnpm fixtures:build` after editing a spec;
 * `build.test.ts` fails when the committed files are out of date.
 *
 * `pnpm qloo:record` (ticket 22) later replaces these with recorded Qloo
 * responses, and deletes the `fx-` files.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { P1 } from "./p1";
import { P2 } from "./p2";
import { P3 } from "./p3";
import { P4 } from "./p4";
import { P5 } from "./p5";
import type { PersonaSpec } from "./spec";

export const PERSONAS: readonly PersonaSpec[] = [P1, P2, P3, P4, P5];

/** Widening moves each end of the Window by this many years (`WIDEN_YEARS` in `src/domain/window.ts`). */
const WIDEN_YEARS = 3;
/** Affinity of the first line, and the step down per rank. */
const TOP_AFFINITY = 0.99;
const AFFINITY_STEP = 0.015;
const MIN_AFFINITY = 0.3;

type Kind = "music" | "film" | "tv" | "book" | "place" | "brand";
const KINDS: Readonly<Record<Kind, { urn: string; prefix: string; withYear: boolean }>> = {
  music: { urn: "urn:entity:artist", prefix: "artist", withYear: false },
  film: { urn: "urn:entity:movie", prefix: "film", withYear: true },
  tv: { urn: "urn:entity:tv_show", prefix: "tv", withYear: true },
  book: { urn: "urn:entity:book", prefix: "book", withYear: true },
  place: { urn: "urn:entity:place", prefix: "place", withYear: false },
  brand: { urn: "urn:entity:brand", prefix: "brand", withYear: false },
};

/** Ids that other fixtures already use for the same entity under a different slug. */
const ID_OVERRIDES: Readonly<Record<string, string>> = {
  "tv:The Doris Day Show": "fx-tv-doris-day-show",
};

export interface Item {
  readonly name: string;
  readonly year?: number;
  readonly tags: readonly string[];
}

export const slug = (text: string): string =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Parses one spec list. Throws on a malformed line: the specs are trusted dev data. */
export function parseItems(text: string, withYear: boolean, context: string): Item[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const expected = withYear ? 3 : 2;
      if (parts.length !== expected || parts.some((part) => part === "")) {
        throw new Error(`${context}: expected ${expected} parts in "${line}"`);
      }
      const [name, ...rest] = parts as [string, ...string[]];
      const tags = (rest.at(-1) ?? "").split(",").map((tag) => tag.trim());
      if (!withYear) return { name, tags };
      const year = Number(rest[0]);
      if (!Number.isInteger(year)) throw new Error(`${context}: bad year in "${line}"`);
      return { name, year, tags };
    });
}

const tagId = (name: string): string => `fx-tag-${slug(name)}`;
const entityId = (kind: Kind, name: string): string =>
  ID_OVERRIDES[`${kind}:${name}`] ?? `fx-${KINDS[kind].prefix}-${slug(name)}`;

const affinityAt = (rank: number): number =>
  Math.max(MIN_AFFINITY, Math.round((TOP_AFFINITY - rank * AFFINITY_STEP) * 100) / 100);

function entityJson(kind: Kind, item: Item, rank: number): string {
  const affinity = affinityAt(rank);
  return JSON.stringify({
    entity_id: entityId(kind, item.name),
    name: item.name,
    type: KINDS[kind].urn,
    properties: {
      description: `Hand-made fixture: ${item.name}${item.year === undefined ? "" : ` (${item.year})`}.`,
      ...(item.year === undefined ? {} : { release_year: item.year }),
    },
    tags: item.tags.map((name) => ({ tag_id: tagId(name), name, type: "urn:tag:fixture" })),
    popularity: Math.round((affinity - 0.02) * 100) / 100,
    query: { affinity, affinity_rank: rank + 1 },
  });
}

/** One Qloo-shaped insights response, an entity per line. */
function insightsFile(kind: Kind, items: readonly Item[]): string {
  const lines = items.map((item, rank) => `      ${entityJson(kind, item, rank)}`);
  const body = lines.length === 0 ? "" : `\n${lines.join(",\n")}\n    `;
  return `{\n  "success": true,\n  "duration": 0,\n  "results": {\n    "entities": [${body}]\n  }\n}\n`;
}

function tagsFile(names: readonly string[]): string {
  const lines = names.map((name, rank) =>
    JSON.stringify({
      tag_id: tagId(name),
      name,
      type: "urn:tag:fixture",
      query: { affinity: affinityAt(rank) },
    }),
  );
  return `{\n  "success": true,\n  "duration": 0,\n  "results": {\n    "tags": [\n${lines.map((line) => `      ${line}`).join(",\n")}\n    ]\n  }\n}\n`;
}

interface IndexEntry {
  type: string;
  location?: string[];
  window?: { min: number; max: number };
  seeds: readonly string[];
  file: string;
}

export interface BuiltFixtures {
  /** File name (under `fixtures/qloo/`) to contents. Includes `index.json`. */
  readonly fixtures: Readonly<Record<string, string>>;
  /** Contents of `src/qloo/fixtures.ts`. */
  readonly fixturesModule: string;
}

const inWindow = (item: Item, min: number, max: number): boolean =>
  item.year !== undefined && item.year >= min && item.year <= max;

export function buildFixtures(): BuiltFixtures {
  const fixtures: Record<string, string> = {};
  const insights: IndexEntry[] = [];

  for (const persona of PERSONAS) {
    const { id, seeds, window } = persona;
    const lists = Object.fromEntries(
      (Object.keys(KINDS) as Kind[]).map((kind) => [
        kind,
        parseItems(persona[kind], KINDS[kind].withYear, `${id} ${kind}`),
      ]),
    ) as Record<Kind, Item[]>;

    const add = (file: string, entry: Omit<IndexEntry, "file" | "seeds">, contents: string): void => {
      fixtures[file] = contents;
      insights.push({ ...entry, seeds, file });
    };

    add(`fx-${id}-music.json`, { type: KINDS.music.urn, location: [...persona.locations] }, insightsFile("music", lists.music));
    for (const kind of ["film", "tv", "book"] as const) {
      const original = lists[kind].filter((item) => inWindow(item, window.min, window.max));
      const wideMin = window.min - WIDEN_YEARS;
      const wideMax = window.max + WIDEN_YEARS;
      const widened = lists[kind].filter((item) => inWindow(item, wideMin, wideMax));
      add(`fx-${id}-${kind}.json`, { type: KINDS[kind].urn, window }, insightsFile(kind, original));
      add(
        `fx-${id}-${kind}-wide.json`,
        { type: KINDS[kind].urn, window: { min: wideMin, max: wideMax } },
        insightsFile(kind, widened),
      );
    }
    add(`fx-${id}-place.json`, { type: KINDS.place.urn, location: [...persona.locations] }, insightsFile("place", lists.place));
    add(`fx-${id}-brand.json`, { type: KINDS.brand.urn }, insightsFile("brand", lists.brand));
    add(`fx-${id}-tags.json`, { type: "urn:tag" }, tagsFile(persona.fingerprint));
  }

  const index = { version: 1, insights, search: { file: "fx-search.json" }, tags: { file: "fx-tags.json" } };
  fixtures["index.json"] = `${JSON.stringify(index, null, 2)}\n`;

  const files = [...Object.keys(fixtures).filter((name) => name !== "index.json"), "fx-search.json", "fx-tags.json"].sort();
  const names = files.map((file) => ({ file, binding: `f${files.indexOf(file)}` }));
  const fixturesModule = `import "server-only";
import indexFile from "../../fixtures/qloo/index.json";
${names.map(({ file, binding }) => `import ${binding} from "../../fixtures/qloo/${file}";`).join("\n")}
import { loadFixtureIndex } from "./fixtureIndex";

/**
 * GENERATED by \`pnpm fixtures:build\` from \`scripts/qloo-fixtures/\`: do not edit.
 * The hand-made \`fx-\` fixtures, bundled statically so they travel with the
 * server build on any host (no runtime file-system access).
 */
export const bundledFixtureIndex = loadFixtureIndex(indexFile, {
${names.map(({ file, binding }) => `  "${file}": ${binding},`).join("\n")}
});
`;
  return { fixtures, fixturesModule };
}

function main(): void {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const { fixtures, fixturesModule } = buildFixtures();
  mkdirSync(join(root, "fixtures", "qloo"), { recursive: true });
  for (const [file, contents] of Object.entries(fixtures)) {
    writeFileSync(join(root, "fixtures", "qloo", file), contents);
  }
  writeFileSync(join(root, "src", "qloo", "fixtures.ts"), fixturesModule);
  console.info(`fixtures:build wrote ${Object.keys(fixtures).length} fixture files and src/qloo/fixtures.ts`);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) main();
