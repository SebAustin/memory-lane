const NAME_PLACEHOLDER = /\{name\}/g;

/**
 * Fills the `{name}` placeholder in generated text. Generated text never
 * contains the Person's first name (ADR 0001); it is filled in on the device,
 * at render time, and nowhere else.
 */
export function fillName(text: string, name: string): string {
  return text.replace(NAME_PLACEHOLDER, () => name);
}
