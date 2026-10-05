const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Returns `next`, except that every part equal to the same place in `previous`
 * is the very object from `previous`. Validating a state builds fresh copies of
 * all of it; this puts the untouched parts back, so a component watching one
 * slice does not see it change when another slice is written.
 */
export function shareStructure<T>(previous: unknown, next: T): T {
  if (Object.is(previous, next)) return next;
  if (Array.isArray(previous) && Array.isArray(next)) {
    const items = next.map((item, index) => shareStructure(previous[index], item));
    const unchanged = items.length === previous.length && items.every((item, index) => item === previous[index]);
    return (unchanged ? previous : items) as T;
  }
  if (isRecord(previous) && isRecord(next)) {
    const keys = Object.keys(next);
    const entries = keys.map((key) => [key, shareStructure(previous[key], next[key])] as const);
    const unchanged =
      keys.length === Object.keys(previous).length && entries.every(([key, value]) => value === previous[key]);
    return (unchanged ? previous : Object.fromEntries(entries)) as T;
  }
  return next;
}
