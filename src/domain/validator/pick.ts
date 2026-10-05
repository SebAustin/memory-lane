/**
 * Deterministic choice from a vetted template list. The same inputs always give
 * the same string, so validation stays pure and idempotent.
 */

/**
 * Picks a template. Prefers one that `accepts` and is not already `taken`;
 * relaxes those preferences, in that order, when nothing qualifies. `salt`
 * spreads picks across a list so neighbouring Cues do not all get the same line.
 *
 * @throws RangeError when `options` is empty (a misconfigured template library).
 */
export function pickTemplate(
  options: readonly string[],
  taken: readonly string[],
  salt: number,
  accepts: (candidate: string) => boolean = () => true,
): string {
  if (options.length === 0) throw new RangeError("TemplateLibrary has no strings for this slot");
  const fitting = options.filter(accepts);
  const pool = fitting.length > 0 ? fitting : options;
  const fresh = pool.filter((candidate) => !taken.includes(candidate));
  const choices = fresh.length > 0 ? fresh : pool;
  return choices[salt % choices.length]!;
}
