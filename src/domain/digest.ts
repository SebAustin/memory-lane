import { LifeStoryDigest, type AvoidItem, type LifeStory } from "@/contracts";

/**
 * The only form of a Life Story that leaves the device (ADR 0001, PLAN 3.2).
 * The first name is dropped and replaced with `{name}` in all free text; the
 * client fills `{name}` back in at render time. Pure: client and server.
 */

export const NAME_PLACEHOLDER = "{name}";

const WORD_CHAR = "[\\p{L}\\p{M}\\p{N}]";
const MAX_AVOID_TOPIC = 60;
/** Contract limits for the digest's free-text fields (Place 80, heritage 60, language 40, occupation 60, name 120). */
const LIMIT = { place: 80, heritage: 60, language: 40, occupation: 60, seedName: 120 } as const;

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** One name part as a pattern: inner spaces match any run of spaces, and any apostrophe form matches. */
const partPattern = (part: string): string =>
  escapeRegExp(part).replace(/\s+/g, "\\s+").replace(/'/g, "['\u2019\u02BC]");

/**
 * Matches the whole first name, and each word of a multi-word name ("Mary Ann"
 * also matches "Mary"), as whole words only, ignoring case and accents'
 * composition. Null when there is no name yet.
 */
function namePattern(firstName: string, possessive: boolean): RegExp | null {
  const name = firstName.normalize("NFC").trim();
  if (name === "") return null;
  const words = name.split(/[\s-]+/).filter((word) => word.length >= 2);
  const parts = [...new Set([name, ...words])].sort((a, b) => b.length - a.length);
  const suffix = possessive ? "(?:['\u2019\u02BC][sS])?" : "";
  return new RegExp(
    `(?<!${WORD_CHAR})(?:${parts.map(partPattern).join("|")})${suffix}(?!${WORD_CHAR})`,
    "giu",
  );
}

/** Replaces the first name in `text`, whole words only, case-insensitively. */
export function replaceFirstName(text: string, firstName: string, replacement: string): string {
  const pattern = namePattern(firstName, false);
  const normalized = text.normalize("NFC");
  return pattern === null ? normalized : normalized.replace(pattern, () => replacement);
}

/**
 * Prepares text for Qloo: the first name (and a possessive after it) is removed,
 * and the gap it leaves is closed. Runs in the browser, because the server never
 * learns the name (PLAN 5.4).
 */
export function scrubQuery(text: string, firstName: string): string {
  const pattern = namePattern(firstName, true);
  const cleaned = pattern === null ? text.normalize("NFC") : text.normalize("NFC").replace(pattern, " ");
  return cleaned.replace(/\s+/g, " ").trim();
}

const fit = (text: string, max: number): string => text.slice(0, max);

/** Cuts at a word boundary within `max` characters, so a matching run of whole words still matches. */
function clipAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const cut = text[max] === " " ? head : head.slice(0, Math.max(head.lastIndexOf(" "), 0) || max);
  return cut.trimEnd();
}

const nameOf = (item: AvoidItem): string => (item.kind === "topic" ? item.text : item.name);

/**
 * Everything on the Avoid List by name: topics, entities and tags. These guide
 * Prompts and screen Cue names; entities and tags are also excluded in Qloo by id.
 * First name replaced, deduplicated (ignoring case), each within the topic limit.
 */
export function avoidTermsOf(avoidList: readonly AvoidItem[], firstName: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const item of avoidList) {
    const term = clipAtWord(replaceFirstName(nameOf(item), firstName, NAME_PLACEHOLDER).trim(), MAX_AVOID_TOPIC);
    if (term === "" || seen.has(term.toLowerCase())) continue;
    seen.add(term.toLowerCase());
    terms.push(term);
  }
  return terms;
}

/** A Seed as `{entityId, name}` with the first name replaced. */
export function seedRefOf(seed: { entityId: string; name: string }, firstName: string) {
  return {
    entityId: seed.entityId,
    name: fit(replaceFirstName(seed.name, firstName, NAME_PLACEHOLDER), LIMIT.seedName),
  };
}

export function toDigest(story: LifeStory): LifeStoryDigest {
  const { firstName } = story;
  const text = (value: string, max: number): string =>
    fit(replaceFirstName(value, firstName, NAME_PLACEHOLDER), max);
  const optional = <K extends string>(key: K, value: string | undefined, max: number) =>
    value === undefined ? {} : ({ [key]: text(value, max) } as Record<K, string>);

  return LifeStoryDigest.parse({
    birthYear: story.birthYear,
    hometown: text(story.hometown, LIMIT.place),
    ...optional("youngAdultCity", story.youngAdultCity, LIMIT.place),
    ...optional("careLocation", story.careLocation, LIMIT.place),
    ...optional("heritage", story.heritage, LIMIT.heritage),
    ...optional("language", story.language, LIMIT.language),
    ...optional("occupation", story.occupation, LIMIT.occupation),
    dementiaStage: story.dementiaStage,
    sensitiveThemesOptIn: story.sensitiveThemesOptIn,
    seeds: story.seeds.map((seed) => seedRefOf(seed, firstName)),
    avoidTopics: avoidTermsOf(story.avoidList, firstName),
  });
}
