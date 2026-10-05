import "server-only";

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const UINT32_MAX = 0xffffffff;

/** 32-bit FNV-1a over the UTF-8 bytes of `text`. */
export function fnv1a(text: string): number {
  let hash = FNV_OFFSET;
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash;
}

/** The fixture score range (PLAN 3.1): illustrative, never mistaken for a strong match. */
export const SYNTHETIC_MIN = 0.3;
export const SYNTHETIC_MAX = 0.9;

/** A deterministic score in 0.30 to 0.90 (two decimals) for `text`: same input, same score, every run. */
export function syntheticScore(text: string): number {
  const fraction = fnv1a(text) / UINT32_MAX;
  const score = SYNTHETIC_MIN + (SYNTHETIC_MAX - SYNTHETIC_MIN) * fraction;
  return Math.round(score * 100) / 100;
}
