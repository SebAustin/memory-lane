/**
 * Avoid List name screening (PLAN section 14.1, EVALS d): when an entity joins
 * the candidate registry, its `name` is checked against the Avoid topics and
 * dropped on a match, before it can reach the screen or the model.
 *
 * Matching is by whole words, in order, case-, accent- and punctuation-
 * insensitive, with a trailing plural "s" ignored ("hospitals" matches
 * "General Hospital"). It is deliberately conservative: a false drop costs one
 * Cue, a missed match could put a painful topic in front of the Person.
 * Pure: it runs on client and server.
 */

const MIN_STEM_LENGTH = 4;

function stem(word: string): string {
  return word.length >= MIN_STEM_LENGTH && word.endsWith("s") && !word.endsWith("ss")
    ? word.slice(0, -1)
    : word;
}

/** Lower-cased, accent-stripped words with punctuation removed and plurals folded. */
function wordsOf(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== "")
    .map(stem);
}

function containsRun(haystack: readonly string[], needle: readonly string[]): boolean {
  for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    if (needle.every((word, offset) => haystack[start + offset] === word)) return true;
  }
  return false;
}

/** The first Avoid topic that `name` matches, or undefined. Blank topics never match. */
export function matchingAvoidTopic(
  name: string,
  avoidTopics: readonly string[],
): string | undefined {
  const nameWords = wordsOf(name);
  return avoidTopics.find((topic) => {
    const topicWords = wordsOf(topic);
    return topicWords.length > 0 && containsRun(nameWords, topicWords);
  });
}

export interface Screened<T> {
  readonly kept: readonly T[];
  readonly dropped: ReadonlyArray<{ readonly item: T; readonly topic: string }>;
}

/** Splits `items` into those that may be shown and those an Avoid topic removes. */
export function screenByAvoidTopics<T extends { readonly name: string }>(
  items: readonly T[],
  avoidTopics: readonly string[],
): Screened<T> {
  const kept: T[] = [];
  const dropped: Array<{ item: T; topic: string }> = [];
  for (const item of items) {
    const topic = matchingAvoidTopic(item.name, avoidTopics);
    if (topic === undefined) kept.push(item);
    else dropped.push({ item, topic });
  }
  return { kept, dropped };
}
