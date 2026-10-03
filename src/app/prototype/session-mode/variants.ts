/**
 * PROTOTYPE, throwaway. Variant keys and names. Kept out of the "use client" switcher so the server
 * page can call `parseVariant`.
 */

export const VARIANT_KEYS = ["A", "B", "C"] as const;
export type VariantKey = (typeof VARIANT_KEYS)[number];

export const VARIANT_NAMES: Readonly<Record<VariantKey, string>> = {
  A: "Turn the Page",
  B: "The Window",
  C: "Run of Show",
};

export function parseVariant(raw: string | string[] | undefined): VariantKey {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase();
  return VARIANT_KEYS.find((key) => key === value) ?? "A";
}
