/**
 * Recursively freezes `value` in place and returns it. Used for module-level
 * constants (such as the demo Life Story) so that no caller can mutate shared data.
 */
export function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
