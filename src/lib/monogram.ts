/**
 * Placeholder picture helpers. Until Qloo images are allow-listed (ticket K),
 * every Cue shows a designed monogram: initials on a deterministic, warm tone.
 */

/** Number of palette tones defined in the monogram stylesheet. */
export const MONOGRAM_TONES = 6;

const LEADING_ARTICLE = /^(the|a|an)$/i;
const MAX_INITIALS = 2;

/** Up to two initials from the first words of `name`, skipping a leading article. */
export function initialsOf(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}]/gu, ""))
    .filter((word) => word !== "");
  const significant = words.length > 1 && LEADING_ARTICLE.test(words[0] ?? "") ? words.slice(1) : words;
  const initials = significant
    .slice(0, MAX_INITIALS)
    .map((word) => Array.from(word)[0]?.toUpperCase() ?? "")
    .join("");
  return initials === "" ? "?" : initials;
}

/** FNV-1a hash of `name`, folded onto the palette. Same name, same tone. */
export function toneOf(name: string): number {
  let hash = 0x811c9dc5;
  for (const char of name) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % MONOGRAM_TONES;
}
