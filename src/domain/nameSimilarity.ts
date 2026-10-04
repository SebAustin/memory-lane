/**
 * How alike two names are, from 0 (nothing in common) to 1 (the same name once
 * case, accents, punctuation, a leading "the" and word order are ignored).
 * Used to decide whether a Qloo search hit is a confident match for what the
 * Caregiver typed (PLAN section 3.1: top >= 0.92 and runner-up < 0.80).
 * Pure: it runs on client and server.
 */

const LEADING_ARTICLE = /^(?:the|a|an)\s+/;

function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(LEADING_ARTICLE, "");
}

const sortedWords = (text: string): string => text.split(" ").sort().join(" ");

/** Edit distance between two strings, with two rolling rows. */
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current.push(Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost));
    }
    previous = current;
  }
  return previous[b.length]!;
}

const ratio = (a: string, b: string): number =>
  a === b ? 1 : 1 - editDistance(a, b) / Math.max(a.length, b.length);

export function nameSimilarity(a: string, b: string): number {
  const left = normalize(a);
  const right = normalize(b);
  if (left === "" || right === "") return 0;
  return Math.max(ratio(left, right), ratio(sortedWords(left), sortedWords(right)));
}
